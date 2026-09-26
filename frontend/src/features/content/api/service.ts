import { ShowroomDto, ShowroomService } from '../types';
import { apiClient } from '../../../services/http/apiClient';
import { API_MODE } from '../../../constants/app';

const mockShowrooms: ShowroomDto[] = [
  { id: '1', name: 'Atelier Vert Flagship Hà Nội', city: 'Hà Nội', address: '128 Nguyễn Trãi', phone: '0900000001', imageUrl: '...', openingHours: '09:00 - 21:30' },
  { id: '2', name: 'Atelier Vert Flagship TP.HCM', city: 'TP.HCM', address: '250 Lê Thánh Tôn', phone: '0900000002', imageUrl: '...', openingHours: '09:00 - 21:30' }
];

const mockShowroomService: ShowroomService = {
  async getShowrooms() { return mockShowrooms; }
};

const realShowroomService: ShowroomService = {
  async getShowrooms() { return apiClient.get<ShowroomDto[], ShowroomDto[]>('/showrooms'); }
};

export const showroomService = API_MODE === 'mock' 
  ? mockShowroomService 
  : realShowroomService;
