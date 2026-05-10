from pathlib import Path
p=Path(__file__).parents[1]/'src'/'pages'/'AdminDashboard.jsx'
s=p.read_text(encoding='utf-8')
start=1
lines=s.splitlines()
segment='\n'.join(lines)
print('Checking entire file, total lines:', len(lines))
open_brace=segment.count('{')
close_brace=segment.count('}')
open_paren=segment.count('(')
close_paren=segment.count(')')
print('Counts: {,},(,):',open_brace,close_brace,open_paren,close_paren)
# running balances
b=0
p=0
for i,ln in enumerate(segment.splitlines(),start=start):
    for ch in ln:
        if ch=='{': b+=1
        elif ch=='}': b-=1
        if ch=='(': p+=1
        elif ch==')': p-=1
    if b<0 or p<0:
        print('Negative balance at line',i,' b=',b,' p=',p)
        break
else:
    print('Final balances at end: b=',b,' p=',p)
