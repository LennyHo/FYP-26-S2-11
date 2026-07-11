export type DripTeaOutlet = {
  storeCode: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

export const DRIPTEA_OUTLETS: DripTeaOutlet[] = [
  {
    storeCode: "DT-001",
    name: "DripTea Orchard",
    address: "313 Orchard Road, #B2-01, Singapore 238895",
    lat: 1.3006,
    lng: 103.8389,
  },
  {
    storeCode: "DT-002",
    name: "DripTea Jurong East",
    address: "50 Jurong Gateway Road, #03-12 JEM, Singapore 608549",
    lat: 1.3336,
    lng: 103.7436,
  },
];
