export interface CalendarHeader {
  selectedDate: {
    day: number;
    month: number;
    fullDate?: Date;
  };
  setSelectedDate: (date: { day: number; month: number; fullDate?: Date }) => void;
  nextSevenDates: {
    day: number;
    month: number;
    fullDate: Date;
  }[];
  monthName: string;
  /** IANA timezone of the centre — "today" is computed in this zone, not a hardcoded one. */
  timeZone: string;
}

export interface Lane {
  laneId: string;
  laneName: string;
  laneType: 'Batting' | 'Hybrid';
}
