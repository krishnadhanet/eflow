let visitorPoll=null,visitorFetching=false,visitorDashboardState={inside:[],expected:[],completed:[]};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const visitorDate=s=>{if(!s)return 'Date unavailable';const p=String(s).split('-');return p.length===3?`${p[2]}-${p[1]}-${p[0]}`:String(s)};
function normalizeDashboard(raw){const out={inside:[],expected:[],completed:[]};Object.keys(out).forEach(k=>out[k]=Array.isArray(raw[k])?raw[k]:Object.values(raw[k]||{}));return out}
function visitorCard(v,type){
  const photo=v.image?`<img class="visitor-photo" src="${esc(v.image)}" alt="">`:`<div class="visitor-photo visitor-avatar"><i class="ri-user-3-line"></i></div>`;
  const chip=type==='inside'?'<span class="status-chip chip-inside">INSIDE</span>':type==='expected'?'<span class="status-chip chip-expected">EXPECTED</span>':'<span class="status-chip chip-done">CHECKED OUT</span>';
  let action='';
  if(type==='inside'&&window.visitorPermissions?.checkout) action=`<button class="btn primary-action checkout" data-id="${v.id}"><i class="ri-logout-box-r-line"></i> Check Out</button>`;
  if(type==='expected'&&window.visitorPermissions?.entry) action=`<a class="btn primary-action" href="${base_url}visitor/manage/${btoa(String(v.id))}"><i class="ri-user-follow-line"></i> Start Gate Entry</a>`;
  const approval=Number(v.is_allow_requried)===1?(Number(v.is_approved)===1?' <span class="status-chip chip-inside">APPROVED</span>':' <span class="status-chip chip-expected">APPROVAL PENDING</span>'):'';
  const timeLabel=type==='inside'?`${visitorDate(v.date)} · Check-in ${esc(v.checkin)}`:type==='completed'?`${visitorDate(v.date)} · Check-out ${esc(v.checkout)}`:`Expected ${visitorDate(v.date)}`;
  return `<article class="visitor-card ${type}" data-search="${esc([v.guest_name,v.mobile,v.employee,v.meeting_purpose].join(' ').toLowerCase())}" data-id="${v.id}"><div class="d-flex gap-3">${photo}<div class="flex-grow-1 min-width-0"><div class="d-flex justify-content-between align-items-start gap-2"><div><div class="visitor-name">${esc(v.guest_name)||'Name pending'}</div><div class="visitor-meta"><i class="ri-phone-line"></i> ${esc(v.mobile)||'Mobile pending'} · ${esc(v.no_of_person||1)} person(s)</div></div><span>${chip}${approval}</span></div><div class="visitor-detail"><i class="ri-user-star-line"></i><span><b>Meet:</b> ${esc(v.employee)||'Host pending'}</span></div><div class="visitor-detail"><i class="ri-briefcase-4-line"></i><span>${esc(v.meeting_purpose)||'Purpose pending'}</span></div><div class="visitor-detail"><i class="ri-time-line"></i><span>${timeLabel}</span></div></div></div><div class="visitor-card-footer">${action}<a class="btn pass-action" target="_blank" href="${base_url}visitor/details/${btoa(String(v.id))}"><i class="ri-qr-code-line"></i> Pass</a></div></article>`;
}
function renderDashboard(raw){
  visitorDashboardState=normalizeDashboard(raw);
  ['inside','expected','completed'].forEach(type=>{const term=$(`.zone-search-input[data-zone="${type}"]`).val()?.trim().toLowerCase()||'';const rows=visitorDashboardState[type].filter(v=>!term||[v.guest_name,v.mobile].join(' ').toLowerCase().includes(term));$(`#${type}-count`).text(rows.length);$(`#hero-${type}-count`).text(visitorDashboardState[type].length);$(`#${type}-grid`).html(rows.length?rows.map(v=>visitorCard(v,type)).join(''):`<div class="empty-zone"><i class="${term?'ri-search-eye-line':'ri-inbox-2-line'}"></i>${term?'No visitor matches this name or mobile number.':'No visitors in this section.'}</div>`)});
}
function fetchDashboard(){
  if(visitorFetching)return;
  visitorFetching=true;
  return $.getJSON(base_url+'visitor/dashboardData').done(renderDashboard).fail(xhr=>{
    if(xhr.status===401||xhr.status===403){clearInterval(visitorPoll);swal('Visitor session expired','Sign in again or check Visitor Desk permissions.','warning')}
  }).always(()=>visitorFetching=false);
}
$(function(){
  renderDashboard(window.visitorDashboardInitial||{});
  $('.zone-search-input').on('input',()=>renderDashboard(visitorDashboardState));
  $(document).on('click','.checkout',function(){
    const btn=$(this),id=btn.data('id');
    swal({title:'Check out this visitor?',text:'The visitor will move to the Completed column.',icon:'warning',buttons:['Cancel','Confirm Check-out']}).then(ok=>{
      if(!ok)return;
      btn.prop('disabled',true);
      $.post(base_url+'visitor/checkoutVisitor',{entry:id},null,'json').done(r=>{
        if(r.status==='success'){fetchDashboard();swal('Check-out Complete','','success')}
        else swal(r.message||'Unable to check out','','error');
      }).fail(xhr=>swal(xhr.responseJSON?.message||'Unable to check out','','error')).always(()=>btn.prop('disabled',false));
    });
  });
  $('.approval-toggle').on('change',function(){
    const toggle=this,enabled=toggle.checked;toggle.disabled=true;
    $.post(base_url+'visitor/approvalSetting',{employee_id:$(toggle).data('id'),enabled:enabled?'1':'0'},null,'json')
      .done(r=>{if(r.status!=='success'){toggle.checked=!enabled;swal(r.message||'Setting could not be updated')}})
      .fail(xhr=>{toggle.checked=!enabled;swal(xhr.responseJSON?.message||'Setting could not be updated')})
      .always(()=>toggle.disabled=false);
  });
  visitorPoll=setInterval(()=>{if(!document.hidden)fetchDashboard()},15000);
  window.addEventListener('beforeunload',()=>clearInterval(visitorPoll));
});
