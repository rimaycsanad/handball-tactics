"""Generate self-contained PWA icons from the project's court mark (no dependencies)."""
from pathlib import Path
import math, struct, zlib

def distance(x, y, ax, ay, bx, by):
    dx, dy = bx-ax, by-ay
    t = max(0, min(1, ((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)))
    return math.hypot(x-ax-t*dx, y-ay-t*dy)

def icon(size):
    background=(16,37,31); white=(220,230,208); gold=(216,173,92)
    lines=[(35,25,93,25),(93,25,93,103),(93,103,35,103),(35,103,35,25),
           (35,64,93,64),(50,25,50,33),(50,33,78,33),(78,33,78,25),
           (50,103,50,95),(50,95,78,95),(78,95,78,103)]
    rows=[]
    for py in range(size):
        row=bytearray([0])
        for px in range(size):
            channels=[0,0,0]
            for ox,oy in [(.25,.25),(.75,.25),(.25,.75),(.75,.75)]:
                x,y=(px+ox)*128/size,(py+oy)*128/size
                color=background
                if abs(math.hypot(x-64,y-64)-18)<1.5 or any(distance(x,y,*line)<1.5 for line in lines): color=white
                ball=math.hypot(x-82,y-41)
                if ball<9.5: color=background
                if ball<7: color=gold
                channels=[a+b for a,b in zip(channels,color)]
            row.extend(round(c/4) for c in channels)
        rows.append(bytes(row))
    def chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')

out=Path(__file__).resolve().parents[1]/'public'/'icons'
out.mkdir(parents=True,exist_ok=True)
for name,size in [('icon-192.png',192),('icon-512.png',512),('maskable-512.png',512),('apple-touch-icon.png',180)]:
    (out/name).write_bytes(icon(size))
print('PWA icons generated.')
