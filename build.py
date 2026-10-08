#!/usr/bin/env python3
"""Собирает index.html из index.src.html: маркер <!--TPL корень шаблон файл--> заменяется на <div id=корень hidden> и <template> из tpl/файл.html."""
import re,sys,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
h=open('index.src.html').read()
def sub(m):
    rid,tid,f=m.groups()
    return '<div id="%s" hidden></div>\n<template id="%s">\n%s</template>\n'%(rid,tid,open('tpl/%s.html'%f).read())
h=re.sub(r'<!--TPL (\S+) (\S+) (\S+)-->\n?',sub,h)
open('index.html','w').write(h)
print('index.html собран,',len(h))
