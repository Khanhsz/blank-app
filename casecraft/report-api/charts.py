"""CaseCraft quantitative exhibits, rendered from already-disclosed report snapshots.

This module deliberately accepts no WorldState and derives no hidden root causes.
Each number belongs to a delivered report's frozen evidence and is labelled as an observation.
"""
from collections import Counter
from io import BytesIO
import base64
import math
import textwrap
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

NAVY = '#112d46'
BLUE = '#2f709b'
LIGHT = '#e6f1f8'
DARK = '#273e4e'
MUTED = '#627786'
GREEN = '#217a66'
RED = '#bd3c46'
GOLD = '#ab7e33'
WHITE = '#ffffff'

plt.rcParams.update({
    'font.family': 'DejaVu Sans', 'font.size': 10, 'axes.titlesize': 13,
    'axes.titleweight': 'bold', 'axes.labelcolor': DARK, 'text.color': DARK,
    'axes.edgecolor': '#d7e2e9', 'xtick.color': MUTED, 'ytick.color': MUTED,
    'figure.facecolor': WHITE, 'axes.facecolor': WHITE,
    'savefig.facecolor': WHITE, 'svg.fonttype': 'none',
})


def _num(x):
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x):
        return None
    return float(x)


def _fig(title, subtitle='', height=3.3):
    fig, ax = plt.subplots(figsize=(9, height), dpi=135)
    fig.subplots_adjust(left=.13, right=.96, bottom=.21, top=.78)
    fig.text(.13, .94, title, color=NAVY, fontsize=15, weight='bold')
    if subtitle:
        fig.text(.13, .865, subtitle, color=MUTED, fontsize=9)
    for spine in ('top', 'right', 'left'):
        ax.spines[spine].set_visible(False)
    ax.grid(axis='y', alpha=.22, color='#90a9b7')
    ax.set_axisbelow(True)
    return fig, ax


def _close_fig(fig):
    plt.close(fig)


def _image(fig):
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=135, bbox_inches='tight', pad_inches=.22)
    _close_fig(fig)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


def _caption(ax, text):
    ax.text(0, -.33, text, transform=ax.transAxes, size=8.1, color=MUTED, va='top')


def _fmt_m(x, _pos=None):
    return f'{x:,.1f}'


def bridge_chart(d):
    b = d.get('bridge') or {}
    opening, closing = _num(b.get('opening')), _num(b.get('closing'))
    effects = [e for e in b.get('effects', []) if isinstance(e, dict) and _num(e.get('value')) is not None][:9]
    if opening is None or closing is None or not effects:
        return None
    labels = ['EBIT trước'] + [str(x.get('label', 'Tác động'))[:26] for x in effects] + ['EBIT sau']
    values = [opening] + [float(e['value']) for e in effects] + [closing]
    fig, ax = _fig('Cầu nối biến động EBIT', 'Triệu tín dụng giả lập • 2 kỳ báo cáo • Chênh lệch kế toán, không phải kết luận nguyên nhân', 4.2)
    cum = opening
    for i, value in enumerate(values):
        if i == 0 or i == len(values)-1:
            ax.bar(i, value, color=NAVY, width=.64)
        else:
            previous, cum = cum, cum + value
            ax.bar(i, abs(value), bottom=min(previous, cum), color=GREEN if value >= 0 else RED, width=.64)
            if i < len(values)-2:
                ax.plot([i+.32, i+.68], [cum, cum], color='#a0b1bd', lw=.9)
    ax.axhline(0, color='#8295a4', lw=.8)
    ax.set_xticks(range(len(labels)), [textwrap.fill(v, 14) for v in labels], rotation=28, ha='right', fontsize=8)
    ax.yaxis.set_major_formatter(FuncFormatter(_fmt_m))
    ax.set_ylabel('EBIT (triệu tín dụng)')
    _caption(ax, 'Đỏ = EBIT giảm; xanh = EBIT tăng. Phần chưa phân bổ chỉ là số dư đối chiếu.')
    return fig


def comparison_chart(d):
    # Only comparable source pairs (same measure, same unit) are charted.
    facts = {str(r.get('label', '')): _num(r.get('value')) for r in d.get('claims', []) if isinstance(r, dict)}
    pairs = [
      ('Doanh thu', 'Revenue · prior 12 months', 'Revenue · latest 12 months'),
      ('EBIT', 'EBIT · prior', 'EBIT · latest'),
      ('Đầu vào', 'COGS · prior 12 months', 'COGS · latest 12 months'),
      ('Marketing', 'Marketing · prior', 'Marketing · latest'),
    ]
    pair_data = [(title, facts.get(prior), facts.get(latest)) for title, prior, latest in pairs]
    pair_data = [(t, a, b) for t,a,b in pair_data if a is not None and b is not None]
    if not pair_data:
        return None
    fig, ax = _fig('So sánh 2 kỳ tài chính', 'Cùng chỉ tiêu, cùng đơn vị • Triệu tín dụng giả lập', 3.7)
    y = list(range(len(pair_data)))
    ax.barh([x-.17 for x in y], [a for _,a,b in pair_data], height=.33, label='Kỳ trước', color='#9bb6c7')
    ax.barh([x+.17 for x in y], [b for _,a,b in pair_data], height=.33, label='Kỳ gần nhất', color=BLUE)
    ax.set_yticks(y, [t for t,_,_ in pair_data])
    ax.invert_yaxis()
    ax.legend(frameon=False, loc='lower right')
    ax.xaxis.set_major_formatter(FuncFormatter(_fmt_m))
    ax.set_xlabel('Triệu tín dụng')
    _caption(ax, 'Giá trị trích nguyên từ các nguồn nghiên cứu đã được cung cấp cho hợp đồng.')
    return fig


def provenance_chart(d):
    rows = [r for r in d.get('claims', []) if isinstance(r,dict)]
    count = Counter(str(r.get('sourceId', '') or '')[:30] for r in rows if r.get('sourceId'))
    if not count:
        return None
    data = count.most_common(10)
    fig, ax = _fig('Nguồn dữ liệu trong báo cáo', 'Số quan sát định lượng được trích dẫn theo mã nguồn', 3.4)
    y = list(range(len(data)))
    ax.barh(y, [v for k,v in data], color=BLUE, height=.58)
    ax.set_yticks(y, [k for k,v in data])
    ax.invert_yaxis()
    ax.xaxis.set_major_locator(matplotlib.ticker.MaxNLocator(integer=True))
    ax.set_xlabel('Số chỉ tiêu')
    for i, (_,v) in enumerate(data):
        ax.text(v+.05,i,str(v),va='center',fontsize=9,color=NAVY)
    _caption(ax, 'Đếm các chỉ tiêu có nguồn, không biểu diễn mức độ đúng sai hay sức mạnh nhân quả.')
    return fig


def coverage_chart(d):
    required = _num(d.get('required'))
    covered = _num(d.get('coverage'))
    if required is None or required <= 0 or covered is None:
        return None
    covered = max(0,min(covered,required))
    fig, ax = _fig('Mức độ bao phủ nghiên cứu', 'Bao nhiêu nhóm bằng chứng cần thiết đã có dữ liệu', 3.0)
    ax.barh([0], [covered], height=.38, color=GREEN, label='Có dữ liệu')
    ax.barh([0], [required-covered], left=[covered], height=.38, color='#e3edf3', label='Còn thiếu')
    ax.set_xlim(0,max(required,1))
    ax.set_yticks([0], ['Nhóm bằng chứng'])
    ax.set_xticks(list(range(int(required)+1)))
    ax.legend(loc='upper right', frameon=False)
    ax.text(required/2, 0, f'{int(covered)} / {int(required)} nhóm', ha='center', va='center', color=NAVY,weight='bold',fontsize=12)
    _caption(ax, 'Không quy đổi mức bao phủ thành điểm chất lượng hoặc kết luận nguyên nhân.')
    return fig


CHARTS=[('comparison','Tài chính — Hai kỳ',comparison_chart),('bridge','EBIT — Cầu nối',bridge_chart),('provenance','Nguồn chứng cứ',provenance_chart),('coverage','Bao phủ nghiên cứu',coverage_chart)]


def create_visuals(report):
    visuals = []
    for key,title,fn in CHARTS:
        fig=fn(report)
        if fig is not None:
            visuals.append({'id':key,'title':title,'image':_image(fig)})
    return visuals


def create_pdf(report):
    from matplotlib.backends.backend_pdf import PdfPages
    buf=BytesIO()
    with PdfPages(buf) as pdf:
        fig=plt.figure(figsize=(8.3,11.7),facecolor=WHITE)
        fig.text(.095,.92,'CASECRAFT  /  BÁO CÁO TRỰC QUAN',fontsize=13,color=BLUE,weight='bold')
        fig.text(.095,.855,textwrap.fill(str(report.get('title','Báo cáo tư vấn')),34),fontsize=23,color=NAVY,weight='bold',va='top')
        fig.text(.095,.72,f"Mã: {str(report.get('id',''))[:40]}",color=MUTED,fontsize=11)
        fig.text(.095,.685,f"Ngày dữ liệu: {report.get('asOfDay','—')}   |   Ngày giao: {report.get('deliveredDay','—')}",color=MUTED,fontsize=11)
        fig.text(.095,.64,'PHƯƠNG PHÁP',weight='bold',color=NAVY,fontsize=13)
        fig.text(.095,.603,'Biểu đồ được dựng từ bằng chứng đã mở của case tại thời điểm đặt nghiên cứu.\nKhông dùng dữ liệu tương lai hay nguyên nhân ẩn của mô phỏng.\nDự báo và quan sát được phân biệt; không có suy luận nhân quả tự động.',color=DARK,fontsize=11,linespacing=1.7,va='top')
        fig.text(.095,.42,'Nguồn:',weight='bold',fontsize=11,color=NAVY)
        source_names=', '.join(str(s) for s in report.get('sourceIds',[])[:12]) or 'Chưa có nguồn định lượng'
        fig.text(.095,.39,textwrap.fill(source_names,85),fontsize=10,color=DARK,va='top')
        fig.text(.095,.1,'CaseCraft · Phân tích theo nguồn đã công bố · Không thay thế kiểm chứng bằng chứng',color=MUTED,fontsize=9)
        pdf.savefig(fig);plt.close(fig)
        for _,_,fn in CHARTS:
            fig=fn(report)
            if fig is not None:
                fig.set_size_inches(10.2,5.1,forward=True)
                pdf.savefig(fig,bbox_inches='tight');plt.close(fig)
    return buf.getvalue()