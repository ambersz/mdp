What do I need to use Rbush for?

* Getting 3-nearest points (nw, income) for estimating future value
* batch inserting the next bush of future values
* Finding the points with highest errors and inserting a point near it or the points it depends on.
* ~~Given a nw, find the income that would result in the highest future value + immediate reward~~ Continuous space, so impossible. Just test random values.

* Get policy that would result in the best total value.


Options:
Always need a separate policy bush (nw, income)-> newIncome policy
1. 3-D bush key (nw, income, error), value (future value)
2. 2 bushed: 2-D (nw, income)-> value and (error, 1) -> '`(nw,income)`'

One one hand, if I know how I need to process the errors, I can do it as I go and I don't even need a bush for it. On the other hand, it would be nice to visualize the errors across the full spectrum.




---
Decision & event loop

I start the year with x money and i income

In response to having x money, I decide to scale down my working hours and will henceforth earn j income per year.

I have x money

I earn income j and pay expenses e

I now have y money

A year later, the random market changes result in me having z money
