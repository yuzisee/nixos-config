#!/bin/sh

librewolf &
E_Pp=$!


# 999 makes it very likely to be killed when we OOM (and we'll separately set epiphany to 1000 to make it the most likely)
echo "999" > /proc/$i{E_P}/oom_score_adj
