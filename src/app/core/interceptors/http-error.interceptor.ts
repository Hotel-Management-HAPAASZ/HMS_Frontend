// src/app/core/interceptors/http-error.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((err: HttpErrorResponse) => {
        // Default
        let message = 'Something went wrong';

        // If backend sent plain text (e.g., "Email already exists")
        if (typeof err.error === 'string' && err.error.trim()) {
          message = err.error;
        }
        // If backend sent JSON with message
        else if (err.error?.message) {
          message = err.error.message;
        }
        // Fallback to HttpErrorResponse message
        else if (err.message) {
          message = err.message;
        }

        return throwError(() => new Error(message));
      })
    );
  }
}