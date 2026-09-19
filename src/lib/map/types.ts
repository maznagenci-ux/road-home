export type MapPlot = {
  id: string;
  code: string;
  plotNo: string;
  name: string;
  neighborhood: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  source: 'stored' | 'district' | 'nominatim';
};
