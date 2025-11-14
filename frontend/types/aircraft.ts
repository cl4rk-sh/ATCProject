export type Aircraft = {
  hex?: string;
  lat?: number;
  lon?: number;
  track?: number;
  true_heading?: number;
  nav_heading?: number;
  t?: string;
  flight?: string;
  alt_baro?: number | string;
  gs?: number;
  airline?: {
    icaoCode: string;
    callsign: string | null;
    name: string | null;
  } | null;
};

