function productExceptSelf(nums) {
  let n = nums.length,
    c = 1,
    isTrue = false;
  if (n === 1) return 1;
  if (n === 0) return 0;

  nums.sort((a, b) => a - b);
  let max = c;


  for (let i = 1; i < n; i++) {
    if(nums[i] === nums[i - 1]) continue;
    if (nums[i] - nums[i - 1] === 1) {
      c++;
      if (max < c) max = c;
    } else {
      if (max < c) max = c;
      c = 1;
    }
  }
  return max;
}

console.log("====================================");
console.log(productExceptSelf([1, 0, 1, 2]));
// console.log(nums[i + 1] - nums[i] === 1, i );

// [1,2,6,7,8]
//[100,4,200,1,3,2]
