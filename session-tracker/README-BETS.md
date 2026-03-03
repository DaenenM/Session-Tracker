How I want the bets structured

when users first register a new account, they receive their first daily reward of 100 coins
Users can use these coins to make bets or purchase 
On the bets page, I want a table with rows that have ranges

Example: 
100 =< Count >= 110 - Odds of winning (based on Data)
111 =< Count >= 121 - Odds of winning (based on Data)
122 =< Count >= 132 - Odds of winning (based on Data)


Create an algorithm that will calculate the odds and payout for Users 
and display the potential winnings in a nice green font (only for potential payout)

This algorithm will also calculate what ranges of bets to list for automation and keeping it fair

For Example:
The algo is beginning to calculate the next bet ranges to list. It must take into consideration the "day", "class_type", and the count for those days.
It will take the history from the datebase and 
filter the data to only show the count for the history of all "Mondays" for example
and list off the lowest payout(highest odds of winning) as the avg/count for all mondays and 
then compare it to overall avg/min
then find the middleground where you officially set the beginning of the highest odds middleground for the bellcurve
You will list the high and lower counts accordingly with the bellcurve calculations

Algo Structure:
Step 1: (Find)
- Total count | Total classes | Overall Avg/min

Step 2:
- Filter data to only show count for a specefic set of days 
(ex: result = day_0f_the_week_Total_Count / (divide) How_Many_Monday_Classes_recorded)
(ex: avg_day = 523 / 4)

Bets can also only be placed before the "time" deadline on those "days" in this data set
class_time = [
    {"day": "Monday", "time": "1pm", class_type: "online"},
    {"day": "Thursday", "time": "8:05am", class_type: "inPerson"},
    {"day": "Friday", "time": "10am", class_type: "inPerson"}
]



