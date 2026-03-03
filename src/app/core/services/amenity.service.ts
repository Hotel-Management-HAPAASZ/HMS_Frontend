import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface AmenityDto { id: number; name: string; }

@Injectable({ providedIn: 'root' })
export class AmenityService {
  private readonly baseUrl = 'http://localhost:8080/api/amenities';

  constructor(private http: HttpClient) {}

  /** GET /api/amenities – raw list */
  list$(): Observable<AmenityDto[]> {
    return this.http.get<AmenityDto[]>(this.baseUrl);
  }

  /** Convenience: only names as Observable<string[]> */
  listNames(): Observable<string[]> {
    return this.list$().pipe(map(list => list.map(a => a.name)));
  }

  /** POST /api/amenities */
  create(name: string): Observable<AmenityDto> {
    return this.http.post<AmenityDto>(this.baseUrl, { name });
  }

  /** PUT /api/amenities/{id} */
  update(id: number, name: string): Observable<AmenityDto> {
    return this.http.put<AmenityDto>(`${this.baseUrl}/${id}`, { name });
  }

  /** DELETE /api/amenities/{id} */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
