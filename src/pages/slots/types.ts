export interface CalendarHeader {
  selectedDate: {
    day: number;
    month: number;
  };
  setSelectedDate: (date: { day: number; month: number }) => void;
  monthAbbreviation: string;
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