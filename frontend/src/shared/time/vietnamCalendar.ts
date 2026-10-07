const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

interface CalendarParts {
  year: string;
  month: string;
  day: string;
}

type CalendarPartType = 'year' | 'month' | 'day';

const vietnamCalendarFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: VIETNAM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const getVietnamCalendarParts = (date: Date): CalendarParts => {
  const parts = vietnamCalendarFormatter.formatToParts(date);
  const read = (type: CalendarPartType): string => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) throw new Error(`Missing ${type} while formatting Vietnam calendar date`);
    return value;
  };

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
  };
};

export const getVietnamToday = (date: Date = new Date()): string => {
  const { year, month, day } = getVietnamCalendarParts(date);
  return `${year}-${month}-${day}`;
};

export const getVietnamMonthStart = (date: Date = new Date()): string => {
  const { year, month } = getVietnamCalendarParts(date);
  return `${year}-${month}-01`;
};
