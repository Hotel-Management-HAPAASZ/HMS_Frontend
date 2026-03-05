import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom, map, tap, catchError, of } from 'rxjs';
import { Room } from '../models/models';
import { RoomSearchResponse } from '../models/room-search.dto';

function formatDateOnly(d: Date): string {
  // NOTE: backend contract previously used local date parts. Keeping this as-is
  // to avoid breaking any assumptions on the server side.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Spring Page<T> shape */
interface PageResp<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** Backend admin Room entity shape (simplified) */
interface AdminRoomEntity {
  id: number;
  roomType: string;     // "Deluxe" etc.
  roomNumber: string;
  floor: number;
  status: string;       // "AVAILABLE", etc.
  maxGuest: number;
  pricePerNight: number;
  amenities?: { id: number; name: string }[];
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly baseUrl = 'http://localhost:8080/api/rooms';

  // ---- in-memory cache (sync style) ----
  private _roomsArr: Room[] = [];
  private _roomsMap = new Map<string, Room>();
  private _cacheLoaded = false;

  // ---- observables (optional, for consumers who want reactivity) ----
  private _rooms$ = new BehaviorSubject<Room[]>([]);
  private _loaded$ = new BehaviorSubject<boolean>(false);

  // ---- persistence keys (sessionStorage keeps it per tab) ----
  private readonly STORAGE_KEY = 'rooms_cache_v1';
  private readonly STORAGE_TS_KEY = 'rooms_cache_ts_v1';

  constructor(private http: HttpClient) {
    // Try to hydrate from sessionStorage so byId() works after refresh/deep-link.
    this.hydrateFromStorage();
  }

  // ========= Mapping helpers =========

  /** Convert backend Search DTO -> UI Room */
  private mapSearchDtoToRoom(dto: RoomSearchResponse): Room {
    return {
      id: String(dto.roomId),
      roomNumber: dto.roomNumber,
      name: dto.roomNumber,
      floor: dto.floor,
      type: dto.roomType.toUpperCase() as any, // "STANDARD" | "DELUXE" | "SUITE"
      pricePerNight: dto.pricePerNight,
      maxGuests: dto.maxGuest,
      amenities: dto.amenities ?? [],
      active: dto.availabilityStatus === 'AVAILABLE',
      availabilityStatus: dto.availabilityStatus,
      unavailableUntil: dto.unavailableUntil,
      // imageUrl: dto.imageUrl
    };
  }

  /** Convert backend admin Room entity -> UI Room */
  private mapEntityToUI(e: AdminRoomEntity): Room {
    return {
      id: String(e.id),
      roomNumber: e.roomNumber,
      floor: e.floor,
      name: e.roomNumber, // or replace with real name when available
      type: (e.roomType ?? '').toUpperCase() as any,
      pricePerNight: e.pricePerNight,
      maxGuests: e.maxGuest,
      amenities: (e.amenities ?? []).map(a => a.name),
      active: e.status === 'AVAILABLE'
    };
  }

  private titleCase(s: string) {
    if (!s) return s as any;
    const lower = s.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }

  // ========= Persistence (sessionStorage) =========

  private persistCache() {
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._roomsArr));
      sessionStorage.setItem(this.STORAGE_TS_KEY, String(Date.now()));
    } catch {
      // ignore quota / storage errors
    }
  }

  private hydrateFromStorage() {
    try {
      const raw = sessionStorage.getItem(this.STORAGE_KEY);
      if (!raw) return;

      const arr: Room[] = JSON.parse(raw);
      if (!Array.isArray(arr)) return;

      this._roomsArr = arr;
      this._roomsMap.clear();
      for (const r of arr) {
        this._roomsMap.set(r.id, r);
      }
      this._cacheLoaded = true;
      this._rooms$.next([...this._roomsArr]);
      this._loaded$.next(true);
    } catch {
      // ignore malformed cache
    }
  }

  // ========= Public reactive helpers (optional use) =========

  /** Emits the cached rooms array. */
  rooms$(): Observable<Room[]> {
    return this._rooms$.asObservable();
  }

  /** Emits true once cache has any data (either from storage or network). */
  loaded$(): Observable<boolean> {
    return this._loaded$.asObservable();
  }

  /** Upserts many rooms into cache (keeps IDs unique). */
  upsertMany(rooms: Room[]) {
    if (!rooms?.length) return;

    let changed = false;
    for (const r of rooms) {
      const id = String(r.id);
      const existing = this._roomsMap.get(id);
      if (!existing) {
        this._roomsMap.set(id, r);
        this._roomsArr.push(r);
        changed = true;
      } else {
        // Replace if anything differs (shallow check)
        const updated = { ...existing, ...r };
        this._roomsMap.set(id, updated);
        const idx = this._roomsArr.findIndex(x => x.id === id);
        if (idx >= 0) this._roomsArr[idx] = updated;
        changed = true;
      }
    }
    if (changed) {
      // Mark cache as loaded once we have any data
      if (!this._cacheLoaded) {
        this._cacheLoaded = true;
        this._loaded$.next(true);
      }
      this._rooms$.next([...this._roomsArr]);
      this.persistCache();
    }
  }

  // =======================================================
  // Search API (kept) — now **also hydrates** the cache
  // =======================================================
  searchAvailableRooms(opts: {
    from?: Date;
    to?: Date;
    adults: number;
    children: number;
    roomType: string;
  }): Observable<Room[]> {
    let params = new HttpParams()
      .set('adults', String(opts.adults))
      .set('children', String(opts.children))
      .set('roomType', opts.roomType);

    if (opts.from) params = params.set('checkInDate', formatDateOnly(opts.from));
    if (opts.to) params = params.set('checkOutDate', formatDateOnly(opts.to));

    return this.http.get<RoomSearchResponse[]>(`${this.baseUrl}/search`, { params })
      .pipe(
        map(list => list.map(dto => this.mapSearchDtoToRoom(dto))),
        tap(list => {
          // ✅ Hydrate cache so Book page can resolve byId() synchronously right after search
          this.upsertMany(list);
        })
      );
  }

  // =======================================================
  // Backward-compatibility facade (sync-style), backed by APIs
  // =======================================================

  /**
   * Load and cache a big page of rooms for synchronous accessors.
   * Call this at app start or before screens that need list()/byId().
   */
  async loadAllForCache(params?: {
    page?: number; size?: number; search?: string;
    roomType?: string; status?: string;
  }) {
    const p = new HttpParams()
      .set('page', String(params?.page ?? 0))
      .set('size', String(params?.size ?? 500)) // adjust as needed
      .set('sortBy', 'roomNumber')
      .set('direction', 'asc');

    const resp = await firstValueFrom(
      this.http.get<PageResp<AdminRoomEntity>>(`${this.baseUrl}`, { params: p })
    );

    const arr = resp.content.map(e => this.mapEntityToUI(e));
    this._roomsArr = arr;
    this._roomsMap.clear();
    for (const r of arr) this._roomsMap.set(r.id, r);
    this._cacheLoaded = true;

    this._rooms$.next([...this._roomsArr]);
    this._loaded$.next(true);
    this.persistCache();
  }

  /** Return cached list (may be empty on first call until loadAllForCache/search runs) */
  list(): Room[] {
    return this._roomsArr;
  }

  /**
   * Return cached room by id.
   * Note: This is intentionally synchronous. It returns `undefined` when the room
   * is not in cache. Consumers that need a guaranteed fetch should call
   * `fetchByIdAndCache` first (async) or preload via `loadAllForCache`.
   */
  byId(id: string | number): Room | undefined {
    const hit = this._roomsMap.get(String(id));
    return hit;
  }

  /**
   * Fetch a room by id and update cache (requires GET /api/rooms/{id} on backend).
   */
  async fetchByIdAndCache(id: string | number): Promise<Room | undefined> {
    try {
      const e = await firstValueFrom(
        this.http.get<AdminRoomEntity>(`${this.baseUrl}/${id}`).pipe(
          catchError(() => of(null as unknown as AdminRoomEntity))
        )
      );
      if (!e) return undefined;

      const r = this.mapEntityToUI(e);
      // upsert cache
      const idx = this._roomsArr.findIndex(x => x.id === r.id);
      if (idx >= 0) this._roomsArr[idx] = r; else this._roomsArr.push(r);
      this._roomsMap.set(r.id, r);

      if (!this._cacheLoaded) {
        this._cacheLoaded = true;
        this._loaded$.next(true);
      }
      this._rooms$.next([...this._roomsArr]);
      this.persistCache();

      return r;
    } catch {
      return undefined;
    }
  }

  /**
   * Create a room (admin). Existing calls use Room; backend expects AddRoomRequest.
   * We'll adapt: type upper -> TitleCase string; active -> status
   * NOTE: Amenity IDs are NOT present on UI Room. If caller provides (any as any).amenityIds, we’ll pass it through.
   */
  async create(payload: Room): Promise<Room | undefined> {
    const body: any = {
      roomType: this.titleCase((payload.type as string) ?? ''),
      pricePerNight: payload.pricePerNight,
      status: payload.active ? 'AVAILABLE' : 'NOT_AVAILABLE',
      maxGuest: payload.maxGuests,
      floor: payload.floor,
      roomNumber: payload.roomNumber,
      amenityIds: (payload as any).amenityIds ?? [],
      description: (payload as any).description ?? null
    };

    try {
      const e = await firstValueFrom(this.http.post<AdminRoomEntity>(`${this.baseUrl}`, body));
      const r = this.mapEntityToUI(e);
      // update cache
      this._roomsArr.push(r);
      this._roomsMap.set(r.id, r);

      if (!this._cacheLoaded) {
        this._cacheLoaded = true;
        this._loaded$.next(true);
      }
      this._rooms$.next([...this._roomsArr]);
      this.persistCache();

      return r;
    } catch (err) {
      console.error('Create room failed', err);
      return undefined;
    }
  }

  async setActive(id: string, active: boolean): Promise<Room | undefined> {
    const body: any = {
      status: active ? 'AVAILABLE' : 'NOT_AVAILABLE'
    };

    try {
      const e = await firstValueFrom(this.http.put<AdminRoomEntity>(`${this.baseUrl}/${id}`, body));
      const r = this.mapEntityToUI(e);
      // update cache
      const idx = this._roomsArr.findIndex(x => x.id === r.id);
      if (idx >= 0) this._roomsArr[idx] = r; else this._roomsArr.push(r);
      this._roomsMap.set(r.id, r);

      if (!this._cacheLoaded) {
        this._cacheLoaded = true;
        this._loaded$.next(true);
      }
      this._rooms$.next([...this._roomsArr]);
      this.persistCache();

      return r;
    } catch {
      return undefined;
    }
  }

  bulkUpload(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upsert', 'true');    // keep default behavior
    formData.append('amenityBy', 'id');   // amenities are IDs like "1;2;3"

    return firstValueFrom(
      this.http.post<any>(`${this.baseUrl}/bulk-upload`, formData)
    );
  }


  /**
   * Generic partial update for admin editing.
   * Accepts an object with fields to change (e.g., { pricePerNight, maxGuest, amenityIds, status }).
   */
  async updatePartial(id: string, patch: any): Promise<Room | undefined> {
    try {
      const e = await firstValueFrom(this.http.put<AdminRoomEntity>(`${this.baseUrl}/${id}`, patch));
      const r = this.mapEntityToUI(e);
      const idx = this._roomsArr.findIndex(x => x.id === r.id);
      if (idx >= 0) this._roomsArr[idx] = r; else this._roomsArr.push(r);
      this._roomsMap.set(r.id, r);

      if (!this._cacheLoaded) {
        this._cacheLoaded = true;
        this._loaded$.next(true);
      }
      this._rooms$.next([...this._roomsArr]);
      this.persistCache();

      return r;
    } catch {
      return undefined;
    }
  }
}
