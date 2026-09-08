"""Real-browser regression QA; no deployed data changes.

Requires Python 3.11+ and `pip install playwright`. Run the production build with
`python scripts/serve-qa.py`, then this script. Uses a fresh context in the
explicit CDP browser (or its own headless Chromium with --headless).
GPS tests use simulated browser coordinates, not the operator's real location.
"""
import argparse
import base64
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5181')
parser.add_argument('--cdp', default='http://127.0.0.1:9222')
parser.add_argument('--headless', action='store_true')
parser.add_argument('--gps-only', action='store_true')
parser.add_argument('--output', type=Path, default=Path('qa-artifacts'))
args = parser.parse_args(); args.output.mkdir(parents=True, exist_ok=True)
results = []; issues = []

def snapshot(page, name):
    page.screenshot(path=str(args.output / f'{name}.png'))
    layout = page.evaluate('''() => {
      const selectors = ['.site-intro-card','.project-search-panel','.maplibregl-ctrl-top-right','.quick-3d','.map-options-toggle','.map-options-panel','.project-bottom-sheet','.imagery-badge','.location-readout'];
      const boxes = selectors.flatMap(selector => {
        const el = document.querySelector(selector); if (!el) return [];
        const style = getComputedStyle(el); const r = el.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || !r.width || !r.height) return [];
        return [{selector,x:r.x,y:r.y,w:r.width,h:r.height}];
      });
      return {boxes,w:innerWidth,h:innerHeight,scroll:document.documentElement.scrollWidth};
    }''')
    errors = []
    for box in layout['boxes']:
        if box['x'] < -1 or box['y'] < -1 or box['x']+box['w'] > layout['w']+1 or box['y']+box['h'] > layout['h']+1:
            errors.append(['overflow',box])
    for i,a in enumerate(layout['boxes']):
        for b in layout['boxes'][i+1:]:
            dx=min(a['x']+a['w'],b['x']+b['w'])-max(a['x'],b['x'])
            dy=min(a['y']+a['h'],b['y']+b['h'])-max(a['y'],b['y'])
            if dx>2 and dy>2: errors.append(['collision',a['selector'],b['selector'],dx,dy])
    if layout['scroll'] > layout['w']: errors.append(['horizontal-scroll',layout['scroll']])
    results.append({'state':name,'layout':layout,'errors':errors})
    (args.output/'results.json').write_text(json.dumps({'results':results,'issues':issues},indent=2))
    assert not errors, (name,errors)

def camera(page):
    values = [float(v) for v in page.url.split('#')[-1].split('/')]
    return values + [0] * (5 - len(values))

def ready(page):
    page.locator('#map[data-ready=true]').wait_for(timeout=40000)
    page.wait_for_timeout(1400)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True) if args.headless else p.chromium.connect_over_cdp(args.cdp)
    contexts=[]
    try:
        for width,height in ([] if args.gps_only else [(375,667),(390,844),(430,932),(844,390),(1440,900)]):
            label=f'{width}x{height}'
            mobile=width<=720 or height<500
            context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,is_mobile=mobile,has_touch=mobile)
            contexts.append(context)
            context.add_init_script("localStorage.setItem('wbb-field-capture-projects', 'preserve-existing-captures-test');")
            page=context.new_page(); errors=[]; requests=[]; failed=[]; responses=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda m:errors.append(m.text) if m.type=='error' and 'favicon.ico' not in m.text else None)
            context.on('request',lambda r:requests.append(r.url))
            page.on('requestfailed',lambda r:failed.append({'url':r.url,'failure':r.failure}))
            page.on('response',lambda r:responses.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
            response=page.goto(args.url,wait_until='load'); assert 'content-security-policy' in response.headers
            ready(page)
            assert page.evaluate("localStorage.getItem('wbb-field-capture-projects')")=='preserve-existing-captures-test'
            assert page.locator('.field-capture').count()==0
            assert not any('ImageServer' in u or 'World_Imagery' in u or 'terrain-tiles' in u for u in requests), requests
            assert not any('DataReviewDashboard-' in u for u in requests)
            snapshot(page,label+'-default')
            if height>=500:
                page.locator('.intro-summary').click(); snapshot(page,label+'-about')
                page.keyboard.press('Escape')
            page.get_by_role('button',name='List',exact=True).click()
            expect(page.locator('.list-toggle')).to_have_attribute('aria-expanded','true')
            snapshot(page,label+'-list')
            page.get_by_role('searchbox').fill('not-a-real-project-name')
            expect(page.locator('.empty-list')).to_be_visible()
            page.get_by_role('searchbox').fill('')
            page.get_by_role('button',name='Proposed',exact=True).click()
            expect(page.get_by_role('button',name='Proposed',exact=True)).to_have_attribute('aria-pressed','true')
            snapshot(page,label+'-filtered')
            page.get_by_role('button',name='All projects',exact=False).click()
            page.get_by_role('searchbox').fill('400 Central')
            page.locator('.project-list li button').first.click(); page.wait_for_timeout(900)
            expect(page.locator('.project-bottom-sheet h2')).to_have_text('400 Central')
            snapshot(page,label+'-selected')
            source=page.locator('.sheet-primary-source'); assert source.get_attribute('href').startswith('https://')
            page.get_by_role('button',name='Close project details').click()
            page.get_by_role('button',name='Map options',exact=True).click()
            page.get_by_role('button',name='Pin colors').click()
            expect(page.get_by_role('button',name='Pin colors')).to_have_attribute('aria-expanded','true')
            snapshot(page,label+'-options')
            for mode in ['satellite-streets','satellite','street-map']:
                page.get_by_role('combobox',name='Imagery mode').select_option(mode)
                page.wait_for_timeout(1500); snapshot(page,label+'-'+mode)
            page.get_by_role('button',name='Close map options').click()
            bearing=camera(page)[3]
            page.get_by_role('button',name='3D buildings',exact=True).click(); page.wait_for_timeout(700)
            expect(page.get_by_role('button',name='3D buildings',exact=True)).to_have_attribute('aria-pressed','false')
            assert camera(page)[4]==0 and abs(camera(page)[3]-bearing)<0.01
            snapshot(page,label+'-2d')
            page.get_by_role('button',name='3D buildings',exact=True).click(); page.wait_for_timeout(700)
            assert camera(page)[4]>40
            page.get_by_role('button',name='Map options',exact=True).click()
            page.get_by_role('button',name='Show all filtered projects').click(); page.wait_for_timeout(1000)
            snapshot(page,label+'-overview')
            if width == 390:
                # Find a rendered cluster by its actual fill pixels; no private
                # MapLibre/React internals or production-only test hooks.
                image = base64.b64encode(page.screenshot(scale='css')).decode()
                point = page.evaluate('''async data => {
                  const img = new Image(); img.src='data:image/png;base64,'+data; await img.decode();
                  const c=document.createElement('canvas'); c.width=img.width;c.height=img.height;
                  const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;
                  const dark=(x,y)=>{const i=(y*c.width+x)*4;return p[i]===23&&p[i+1]===45&&p[i+2]===54;};
                  for(let y=125;y<c.height-75;y++)for(let x=20;x<c.width-65;x++)if(dark(x,y)&&dark(x+4,y)&&dark(x,y+4))return {x,y};
                  return null;
                }''', image)
                assert point, 'No visible overview cluster'
                before = camera(page)[0]
                page.mouse.click(point['x'],point['y']); page.wait_for_timeout(1000)
                assert camera(page)[0] > before, 'Cluster click did not expand'
                snapshot(page,'cluster-click-expanded')
            assert not errors, errors
            assert not responses, responses
            issues.append({'viewport':label,'errors':errors,'failed':failed,'http_errors':responses,'requests':len(requests)})
            context.close(); contexts.remove(context)

        # Simulated location: accuracy, following, free pan, recenter, heading.
        context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,permissions=['geolocation'],geolocation={'latitude':27.772,'longitude':-82.641,'accuracy':8})
        contexts.append(context)
        context.add_init_script("DeviceOrientationEvent.requestPermission = async () => 'granted';")  # simulated compass permission
        page=context.new_page(); page.goto(args.url); ready(page)
        locate=page.locator('.maplibregl-ctrl-geolocate'); expect(locate).to_be_enabled()
        locate.click(); expect(page.locator('.location-readout')).to_contain_text('±8 m',timeout=25000)
        page.wait_for_timeout(1000)
        expect(page.locator('.maplibregl-user-location-dot')).to_be_visible()
        expect(page.locator('.maplibregl-user-location-accuracy-circle')).to_be_visible()
        page.evaluate("window.dispatchEvent(new DeviceOrientationEvent('deviceorientation',{alpha:90,absolute:false}))")
        assert page.locator('.maplibregl-user-location-dot.has-heading').count()==0
        page.evaluate("window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute',{alpha:90,absolute:true}))")
        expect(page.locator('.maplibregl-user-location-dot')).to_have_class(__import__('re').compile('has-heading'))
        snapshot(page,'gps-simulated-accurate')
        page.get_by_role('button',name='List',exact=True).click()
        expect(page.locator('.project-list-meta')).to_contain_text('Nearest projects')
        assert page.locator('.project-list .view-details').first.inner_text().endswith(('ft','mi'))
        snapshot(page,'nearby-list-with-distances')
        page.get_by_role('button',name='Done',exact=True).click()
        page.mouse.move(170,430); page.mouse.down(); page.mouse.move(270,500,steps=12); page.mouse.up(); page.wait_for_timeout(800)
        expect(locate).to_have_class(__import__('re').compile('background'))
        locate.click(); page.wait_for_timeout(900)
        assert abs(camera(page)[1]-27.772)<0.001 and abs(camera(page)[2]+82.641)<0.001
        expect(locate).to_have_class(__import__('re').compile('active'))
        context.set_geolocation({'latitude':27.772,'longitude':-82.641,'accuracy':950})
        expect(page.locator('.location-readout')).to_contain_text('±950 m')
        snapshot(page,'gps-simulated-approximate')
        context.set_geolocation({'latitude':40.7135,'longitude':-74.0066,'accuracy':8})
        page.get_by_role('button',name='List',exact=True).click()
        expect(page.locator('.coverage-note')).to_contain_text('No mapped projects within 5 miles')
        snapshot(page,'outside-coverage-list')
        page.get_by_role('button',name='Done',exact=True).click()
        locate.click(); page.wait_for_timeout(300)
        expect(page.locator('.location-readout')).to_have_count(0)
        context.close(); contexts.remove(context)

        # Explicit denial is simulated, never an actual device permission change.
        context=browser.new_context(viewport={'width':375,'height':667},is_mobile=True,has_touch=True)
        contexts.append(context)
        context.add_init_script("navigator.geolocation.watchPosition=(ok,fail)=>{setTimeout(()=>fail({code:1,message:'QA denial'}),0); return 1;}; navigator.geolocation.clearWatch=()=>{};")
        page=context.new_page(); page.goto(args.url); ready(page)
        page.locator('.maplibregl-ctrl-geolocate').click()
        expect(page.locator('.location-readout')).to_contain_text('Location blocked')
        snapshot(page,'gps-simulated-denied')
        page.get_by_role('button',name='Dismiss location message').click()
        context.close(); contexts.remove(context)

        context=browser.new_context(viewport={'width':390,'height':844}); contexts.append(context)
        page=context.new_page(); requests=[]; page.on('request',lambda r:requests.append(r.url))
        page.goto(args.url+'/review'); page.locator('.review-dashboard').wait_for()
        page.wait_for_timeout(500)
        assert not any('MapView-' in u or 'openfreemap.org' in u for u in requests), requests
        scroll=page.locator('.review-dashboard').evaluate('(el)=>{el.scrollTop=el.scrollHeight;return {top:el.scrollTop,height:el.scrollHeight,client:el.clientHeight}}')
        assert scroll['top']>0
        page.screenshot(path=str(args.output/'review-bottom.png'))
        results.append({'state':'review-route','scroll':scroll,'no_map_engine':True})
        page.goto(args.url+'/#16/27.7718/-82.64/35/0'); ready(page)
        assert camera(page)[3:]==[35,0]
        expect(page.get_by_role('button',name='3D buildings')).to_have_attribute('aria-pressed','false')
        page.get_by_role('button',name='3D buildings').click(); page.wait_for_timeout(700)
        assert camera(page)[3]==35
        results.append({'state':'deep-link-bearing-preserved','camera':camera(page)})
        context.close(); contexts.remove(context)
        print(json.dumps({'states_passed':len(results),'issues':issues},indent=2))
    finally:
        (args.output/'results.json').write_text(json.dumps({'results':results,'issues':issues},indent=2))
        for context in contexts: context.close()
        if args.headless: browser.close()
