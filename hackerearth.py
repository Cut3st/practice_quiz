# QNS1:
def filter_names(names, min_length):
    filtered_list = []
    for name in names:
        if len(name) <= min_length:
            filtered_list.append(name)
    return filtered_list
    # ISSUE: did not use an empty list to store, and tried to remove from original list, causing the for loop to skip the next index of the previous one removed
    
# QNS2:
def count_words(word_list):
    counted = {}
    for w in word_list:
        if w in counted:
            counted[w] += 1
        else:
            counted[w] = 1
    return counted
    # ISSUE: 
    # - Index out of range, Happened because you tried to access word_list[w+1] when w was already at the last index. Fix: avoid w+1 unless you stop at len(word_list)-1
    # - Confusion about .update() vs direct assignment. Remembered that counted[w] = 1 or counted[w] += 1 directly updates the key’s value
    # - Your first logic only checked word_list[w] == word_list[w+1], instead i should have just gone through each word without comparing and update dict

# QNS 3:
 def check_guess(answer, guess):
    a = 0
    b = 0
    used_guess = [False] * len(guess)
    for ans in range(len(answer)):
        # print(answer[ans], guess[ans], sep = " = ")
        if answer[ans] == guess[ans]:
            a += 1
            used_guess[ans] = True
            # print(f"a = {a}")
    for ans in range(len(answer)):
        if answer[ans] != guess[ans]:
            for gus in range(len(guess)):
                if not used_guess[gus] and answer[ans] == guess[gus]:
                    b += 1
                    used_guess[gus] = True
                    break
            # print(f"b = {b}")
    return (a,b)
    # ISSUE 2: Double-counting duplicates.
    # Without correctly tracking which guess positions are already matched,
    # the same guess value can be reused multiple times, inflating `b`.

    # ISSUE 3: Tuple creation timing in earlier versions.
    # You created `tup = (a,b)` before updating counts, so it printed old values.
    # Fixed by moving tuple creation after increments.

    # ISSUE 4: Overly complex conditions.
    # You don't need separate `elif answer[ans] not in guess` checks.
    # Just skip exact matches and handle partial matches with proper "used" tracking.
       
# QNS 4:
def binary_search_recursive(sorted_list, target):
    if not sorted_list:   # empty list check
        #print("List is empty → return False")
        return False

    n = len(sorted_list)
    L = 0
    R = n - 1

    while L <= R:
        M = (L + R) // 2
        # print(f"Searching in: {sorted_list[L:R+1]} (L={L}, R={R}, M={M}, mid={sorted_list[M]})")

        if target == sorted_list[M]:
            # print(f"Found target {target} at index {M}")
            return True
        if target > sorted_list[M]:
            # print(f"Target {target} > {sorted_list[M]} → move right")
            L = M + 1 # OR return binary_search_recursive(sorted_list[M+1:], target)
        if target < sorted_list[M]:
            # print(f"Target {target} < {sorted_list[M]} → move left")
            R = M - 1 # OR return binary_search_recursive(sorted_list[:M], target)

    # print(f"Target {target} not found")
    return False
    # ISSUE: NOT KNOWING WHAT BINARY SEARCH IS SO PLEASE BROTHER KNOW THIS SHIT

# QNS 5:
def sort_by_age(people):
    age_sort = sorted(people, key=lambda x: x["age"])
    return age_sort
    ISSUE: not knowing how sorted() works note key=lambda tells u the following conditions is how i want it to be sorted

# QNS 6:
def find_min(a_list):
    # Base Case: If the list has only one element, return it.
    if len(a_list) == 1:
        return a_list[0]
    return min(a_list)

# QNS 7
def is_palindrome(s):
    checked = [False] * len(s)
    c = 0
    if len(s) == 0 or len(s) <= 1:
        return True
    while not checked[c] and not checked[-(c+1)]:
            if s[c] == s[-(c+1)]:
                checked[c] = True
                checked[-(c+1)] = True
                c += 1
            else:
                return False
    if c != round(c+0.5/2):
        return False
    else:
        return True
    # FIRST ONE I DID FULLY BY MYSELF SORT OF
    
            
            
# QNS 8
def merge(left, right, key):
    merged_list = []
    merged = left + right
    merged_list = sorted(merged, key=lambda x: x[key])
    return merged_list
    #ISSUE: WORKS FINE BUT NOT MERGE SORT

# EXAMPLE ANSWER WITHOUT SORTED()
def merge_with_indices(left, right, key):
    merged_list = []
    i = 0  # <--- Here it is
    j = 0  # <--- Here it is

    # Loop while our pointers are still inside their lists
    while i < len(left) and j < len(right):
        if left[i][key] <= right[j][key]:
            merged_list.append(left[i])
            i += 1  # Move the 'left' pointer
        else:
            merged_list.append(right[j])
            j += 1  # Move the 'right' pointer

    # Add the leftovers
    merged_list.extend(left[i:])
    merged_list.extend(right[j:])
    return merged_list

# QNS 9
def has_duplicates(a_list):
    checked = []
    if len(a_list) == 0:
        return False
    for num in a_list:
        if num in checked:
            return True
        else:
            checked.append(num)
    return False
    # SMALL ISSUE: not knowing when to do output for, for loops
# QNS 10
def sum_main_diagonal(matrix):
    checked = []
    n = 0
    for row in matrix:
        checked.append(row[n])
        n+=1
    total = sum(checked)
    return total
    # A MORE perfect sol would have been
    def sum_main_diagonal(matrix):
        total = 0
        
        # Handle the edge case of an empty matrix (e.g., []) or
        # a matrix containing an empty list (e.g., [[]])
        if not matrix or not matrix[0]:
            return 0
            
        # Get the number of rows and columns
        num_rows = len(matrix)
        num_cols = len(matrix[0])
        
        # The diagonal can only be as long as the smallest dimension.
        # min(3, 2) is 2, so the loop will run for i = 0, 1.
        min_dimension = min(num_rows, num_cols)
        
        # Iterate only up to the smallest dimension
        for i in range(min_dimension):
            total += matrix[i][i]    
        return total

# QNS 11
def factorial_recursive(n):
    limit = n-1
    count = 1
    fact = n
    while count <= limit:
        fact *=(n-count)
        count += 1
    return fact
# PERFECT BUT MISSING 0!, add in a check n == 0 return 1

# QNS 12
def find_highest_rated_string(string_list):
    # Your code here to find and return the highest-rated string
    if not string_list:
        return None
    comp_len = []
    for string in string_list:
        temp_list = []
        # print(string)
        for l in string:
            # print(l)
            if l not in temp_list:
                temp_list.append(l)
            else:
                continue
        comp_len.append(len(temp_list))
        # print(temp_list)
        # print(comp_len)
    unique = max(comp_len)

    final_list = []
    for x in range(len(comp_len)):
        if comp_len[x] == unique:
            final_list.append(string_list[x])
    return min(final_list)
    # ISSUE: lexicographic using min()
    
# QNS 13
def get_product(list_a, list_b):
    good_num = []
    odd_num = []
    
    for num in list_a:
        s = str(num)
        if (s == s[::-1] and s.count("2") <= 1) or s.count("2") == 1:
            good_num.append(num)
    print(f"THIS IS ODD {good_num}")
    for num in list_b:
        if num % 2 != 0:
            odd_num.append(num)
    print(f"THIS IS ODD {odd_num}")
    
    product = 1
    for n in good_num + odd_num:
        product *= n
    return product

