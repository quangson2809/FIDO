export interface ShowroomDto {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  imageUrl: string;
  openingHours: string;
}

export interface ShowroomService {
  getShowrooms(): Promise<ShowroomDto[]>;
}
