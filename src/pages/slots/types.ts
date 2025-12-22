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
}

export interface Lane {
  laneId: string;
  laneName: string;
  laneType: 'Batting' | 'Hybrid';
}
