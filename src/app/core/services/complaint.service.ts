import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';
import { Complaint, ComplaintStatus } from '../models/models';

const COMPLAINTS_KEY = 'app_complaints_v1';

function uuid() {
  return crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2) + Date.now().toString(16);
}
function nowISO() { return new Date().toISOString(); }

@Injectable({ providedIn: 'root' })
export class ComplaintService {
  constructor(private storage: StorageService) {}

  list(): Complaint[] {
    return this.storage.get<Complaint[]>(COMPLAINTS_KEY, []);
  }

  listByUser(userId: string): Complaint[] {
    return this.list().filter(c => c.userId === userId);
  }

  create(userId: string, subject: string, message: string): Complaint {
    const list = this.list();
    const c: Complaint = {
      id: uuid(),
      userId,
      subject,
      message,
      status: 'OPEN',
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    list.unshift(c);
    this.storage.set(COMPLAINTS_KEY, list);
    return c;
  }

  setStatus(id: string, status: ComplaintStatus) {
    const list = this.list();
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return;
    list[idx] = { ...list[idx], status, updatedAt: nowISO() };
    this.storage.set(COMPLAINTS_KEY, list);
  }

  
}