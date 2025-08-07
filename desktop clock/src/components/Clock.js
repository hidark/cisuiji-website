import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import './Clock.css';

dayjs.locale('zh-cn');

const Clock = ({ format24 = true, showDate = true, showWeek = true }) => {
  const [time, setTime] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(dayjs());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeFormat = format24 ? 'HH:mm:ss' : 'hh:mm:ss A';
  const dateFormat = 'YYYY年MM月DD日';
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekDay = weekDays[time.day()];

  return (
    <div className="clock-container">
      <div className="time-display">
        {time.format(timeFormat)}
      </div>
      {showDate && (
        <div className="date-display">
          {time.format(dateFormat)}
        </div>
      )}
      {showWeek && (
        <div className="week-display">
          星期{weekDay}
        </div>
      )}
    </div>
  );
};

export default Clock;