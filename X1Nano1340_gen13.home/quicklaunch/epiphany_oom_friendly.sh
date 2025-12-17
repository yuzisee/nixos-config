#!/bin/sh

epiphany &
E_Pp=$!


# 1000 makes it the most likely to be killed if we OOM
echo "1000" > /proc/$i{E_P}/oom_score_adj
