export interface RoomSearchResponse {
  roomId: number;
  roomType: string;
  roomNumber: string;
  pricePerNight: number;
  maxGuest: number;
  floor:number;
  availabilityStatus: string; 
  amenities: string[];
  imageUrl?: string;
}