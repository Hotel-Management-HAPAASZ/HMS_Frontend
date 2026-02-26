import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface AmenityDto { id: number; name: string; }

@Injectable({ providedIn: 'root' })
export class AmenityService {
  private readonly baseUrl = 'http://localhost:8080/api/amenities';
  // If you use environments:
  // private readonly baseUrl = `${environment.apiBase}/amenities`;

  constructor(private http: HttpClient) {}

  /** Raw list as Observable */
  list$(): Observable<AmenityDto[]> {
    return this.http.get<AmenityDto[]>(this.baseUrl);
  }

  /** Convenience: only names as Observable<string[]> */
  listNames(): Observable<string[]> {
    return this.list$().pipe(map(list => list.map(a => a.name)));
  }
}