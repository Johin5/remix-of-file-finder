import { startOfMonth, endOfMonth } from 'date-fns';

export const getMonthRange = (referenceDate: Date, startDay: number) => {
  if (startDay === 1) {
    return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
  }

  const currentDay = referenceDate.getDate();
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  
  let start: Date, end: Date;

  if (currentDay >= startDay) {
      start = new Date(year, month, startDay);
      end = new Date(year, month + 1, startDay - 1);
  } else {
      start = new Date(year, month - 1, startDay);
      end = new Date(year, month, startDay - 1);
  }
  
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

export const getWeekStartOption = (dayName: string): { weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 } => {
    const map: {[key: string]: 0|1|2|3|4|5|6} = { 
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 
        'Thursday': 4, 'Friday': 5, 'Saturday': 6 
    };
    return { weekStartsOn: map[dayName] ?? 0 };
};

export const rotateWeekDays = (startDay: string) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const startIndex = getWeekStartOption(startDay).weekStartsOn;
    return [...days.slice(startIndex), ...days.slice(0, startIndex)];
};
