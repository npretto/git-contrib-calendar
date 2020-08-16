/**
 * @file Calendar component.
 */

const React = require('react');
const PropTypes = require('prop-types');
const { Box, Text, Newline } = require('ink');
const groupBy = require('lodash.groupby');
const uniqBy = require('lodash.uniqby');
const importJsx = require('import-jsx');

const { getLog } = require('../services/git');
const { getCalendarDays, DAY_NAMES, MONTH_NAMES } = require('../utils/date');

const CalendarDay = importJsx('./CalendarDay');

/**
 * Return the months data for display purposes.
 *
 * @param {Object[]} days The first day for every week displayed.
 *
 * @return {Object[]} The months data.
 */
const getMonths = (days) => {
  return uniqBy(
    days,
    (calendarDay) => `${calendarDay.year}-${calendarDay.monthIndex}`,
  ).map(({ monthIndex, year }) => ({
    monthIndex,
    daysCount: days.filter(
      (calendarDay) =>
        calendarDay.monthIndex === monthIndex && calendarDay.year === year,
    ).length,
  }));
};

/**
 * Return calendar days data with commits count per day.
 *
 * @param {Object[]} calendarDays The calendar days data.
 * @param {Object[]} commits The commits data.
 *
 * @return {Object[]} The calendar days data with commit counts.
 */
const getCalendarDaysWithCommitCounts = (calendarDays, commits) => {
  const groupedCommits = groupBy(commits, (commit) =>
    commit.date.substring(0, 10),
  );

  return calendarDays.map((day) => ({
    ...day,
    commitsCount: groupedCommits[day.date]
      ? groupedCommits[day.date].length
      : 0,
  }));
};

const Calendar = ({ repoPath, author }) => {
  const [commits, setCommits] = React.useState(null);
  const calendarDays = getCalendarDays();

  React.useEffect(() => {
    const fetchCommits = async () => {
      const options = {
        '--since': calendarDays[0].date,
        '--max-parents': '1', // exclude merge commits
      };

      if (author) {
        options['--author'] = author;
      }

      const logData = await getLog(repoPath, options);

      setCommits(logData.all);
    };

    fetchCommits();
  }, []);

  if (!commits) {
    return null;
  }

  const days = getCalendarDaysWithCommitCounts(calendarDays, commits);
  const groupedDays = groupBy(days, 'dayIndex');
  const months = getMonths(days[0]);

  return (
    <Box flexDirection="column">
      <Box marginLeft={4}>
        {months.map(({ monthIndex }, index) => {
          const month = MONTH_NAMES[monthIndex];
          const marginLeft =
            index === 0 ? 0 : Math.max(1, months[index - 1].daysCount * 2 - 3);

          return (
            // eslint-disable-next-line react/no-array-index-key
            <Box key={`${monthIndex}-${index}`} marginLeft={marginLeft}>
              <Text>
                {index === 0 && months[0].daysCount === 1
                  ? month.substring(0, 1)
                  : month}
              </Text>
            </Box>
          );
        })}
      </Box>

      {DAY_NAMES.map((dayName, index) => (
        <Box key={dayName}>
          <Box marginRight={1}>
            <Text>{dayName}</Text>
          </Box>

          {groupedDays[index].map(({ date, commitsCount }) => (
            <CalendarDay key={date} commitsCount={commitsCount} />
          ))}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text>
          Total commits: {commits.length}
          <Newline />
          Avg commits per day: {(commits.length / days.length).toFixed(2)}
        </Text>
      </Box>
    </Box>
  );
};

Calendar.propTypes = {
  repoPath: PropTypes.string.isRequired,
  author: PropTypes.string,
};

module.exports = Calendar;
