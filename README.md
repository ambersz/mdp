* Start with a monotonically increasing function 

* Split into integer range buckets that go up to 100, plus special brackets at 1/3, 1/2 breakpoints. 

* Linearly interpolate value between breakpoints.

* For value updates, backport the interpolation.

