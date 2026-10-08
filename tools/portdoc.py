#!/usr/bin/env python3
"""Печатные формы: берёт всё между </helmet> и </x-dc> макета и кладёт в tpl/<имя>.html с заменами."""
import os
HERE=os.path.dirname(os.path.abspath(__file__))
def portdoc(macet,name,extra=()):
    t=open('/home/claude/maket/'+macet).read()
    a=t.index('</helmet>')+len('</helmet>\n'); b=t.index('</x-dc>')
    body=t[a:b]
    for x,y in extra:
        assert x in body,'нет в макете: '+x[:70]
        body=body.replace(x,y)
    open(os.path.join(HERE,'..','tpl',name+'.html'),'w').write(body)
    print(name,len(body))
