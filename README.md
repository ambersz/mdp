# Setup
* set net worth breakpoints
* set income breakpoints

# Value base cases
* when net worth exceeds certain amount, value is always max
* when income exceeds certain amount.... ??? What to do here?
  * shouldn't have to handle this case because whatever initial income you choose will only go down from there. Just won't ever need to check the value for a higher income
* When net worth is 0 or lower
  * value is 0 because you don't get anything for the rest of your life, but you've lived your life fine so far?
  * value is -max because you've invalidated all the work you've done so far and "ruined" your life?

# Process for getting next value

One-time
1. pre-compute a mapping from yearly return to probability of occurence
  1. Could pull from yearly historical data
  2. Or use mean and variance of expected returns and condense into some number of buckets

Every time
1. Add income to net worth
2. If new net worth is less than 1, return net worth
3. Else, subtract 1 from net worth
4. Using the pre-computed return-likelihood mapping, get the mapping of next net-worth-likelihoods
5. For each income breakpoint which is below the current one, compute the potential next value (weighted average by net-worth-likelihoods)
6. Store the max computed next value and the income associated with it
7. return array of `[value, policy]`

# Estimating Value from Breakpoints

Breakpoints for net worth and income should be independent?
Bilinear interpolate in the grid of closest 4 combined breakpoints

