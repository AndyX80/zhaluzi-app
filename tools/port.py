#!/usr/bin/env python3
"""Переносит разметку экрана из макета (*.dc.html) в tpl/<имя>.html.
Использование из python: port(макет, имя, замены=[(старое, новое), ...])
 - берёт содержимое корневого div макета (без внешней обёртки фиксированной ширины);
 - ссылки на другие экраны <a href="X.dc.html"> превращает в <button onClick="{{go.X}}"> (go.* даёт JalScreen.go);
   прочие <a href="..."> (tel:, https:) остаются ссылками;
 - нижнюю панель position:absolute превращает в fixed с учётом safe-area.
После этого добавь маркер <!--TPL <имя>Root tpl_<имя> <имя>--> в index.src.html и запусти python3 build.py."""
import re,os
HERE=os.path.dirname(os.path.abspath(__file__))
MAKET='/home/claude/maket/'
def port(macet,name,extra=()):
    t=open(MAKET+macet if not os.path.isabs(macet) else macet).read()
    a=t.index('<div class="{{rootCls}}"'); a=t.index('\n',a)+1
    b=t.rindex('</div>\n</x-dc>')
    body=t[a:b]
    out=[];stack=[];pos=0
    for m in re.finditer(r'<a ([^>]*)>|</a>',body):
        out.append(body[pos:m.start()]);pos=m.end()
        if m.group(0)=='</a>': out.append('</button>' if stack.pop() else '</a>')
        else:
            mm=re.match(r'href="(\w+)\.dc\.html"(.*?)style="(.*)$',m.group(1),re.S)
            if mm: stack.append(True);out.append('<button onClick="{{go.%s}}"%sstyle="border: 0; background: transparent; %s>'%(mm.group(1),mm.group(2),mm.group(3)))
            else: stack.append(False);out.append(m.group(0))
    out.append(body[pos:]);body=''.join(out)
    for pad in ('12px 12px 12px','12px 8px 12px'):
        pass
    body=re.sub(r'position: absolute; left: 0; right: 0; bottom: 0; padding: 0 12px (\d+)px 12px',lambda m:'position: fixed; left: 0; right: 0; bottom: 0; z-index: 5; padding: 0 12px calc(%spx + env(safe-area-inset-bottom, 0px)) 12px'%m.group(1),body)
    for x,y in extra:
        assert x in body,'нет в макете: '+x[:70]
        body=body.replace(x,y)
    open(os.path.join(HERE,'..','tpl',name+'.html'),'w').write(body+'\n')
    print('tpl/%s.html: %d символов'%(name,len(body)))
