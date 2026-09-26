import { ShowroomDto, ShowroomService } from '../types';
import { mockUiShowrooms } from '../../../mocks/uiData';

// Showroom is a presentation fixture. The baseline API document does not define
// a dedicated showroom endpoint, so real-mode code must not invent one here.
const mockShowroomService: ShowroomService = {
  async getShowrooms() {
    return mockUiShowrooms.map((showroom) => ({
      id: showroom.id,
      name: showroom.name,
      city: showroom.city === 'hn' ? 'Hà Nội' : 'TP. Hồ Chí Minh',
      address: showroom.address,
      phone: showroom.phone,
      imageUrl: showroom.imageUrl,
      openingHours: showroom.openingHours,
    }));
  },
};

export const showroomService = mockShowroomService;
