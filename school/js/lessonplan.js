// ✅ PERMISSION
function hasPermission(id){
    return userPermissions.includes(id.toString());
}

// ✅ MESSAGE
function showMsg(type,msg){
    let icon = type == 'success' ? 'success' : 'error';
    swal({
        title: msg,
        icon: icon,
        timer: 1500,
        buttons: false
    });
}

// ✅ LOADER
function showLoader(title="Processing..."){
    swal({
        title: title,
        text: "Please wait...",
        icon: "info",
        buttons: false,
        closeOnClickOutside: false,
        closeOnEsc: false
    });
}

// ✅ OPEN FORM
function openForm(){
$('#lessonModal').modal('show');
$('#edit_id').val('');
$('#lesson_title').val('');
$('#topicBody').html('');
addRow();
}

// ✅ ADD ROW
function addRow(){
$('#topicBody').append(`
<tr>
<td><input class="form-control chapter_number"></td>
<td><input class="form-control chapter_title"></td>
<td><input class="form-control topic"></td>
<td>
<select class="form-control method">
<option value="">Select</option>
<option>Lecture</option>
<option>Practical</option>
</select>
</td>
<td><button class="btn btn-danger btn-sm" onclick="$(this).closest('tr').remove()">X</button></td>
</tr>
`);
}

// ✅ SAVE LESSON
function saveLesson(){

if(!$('#lesson_title').val()){
    showMsg('error','Enter title'); return;
}

let details=[];

$('#topicBody tr').each(function(){
details.push({
chapter_number:$(this).find('.chapter_number').val(),
chapter_title:$(this).find('.chapter_title').val(),
topic:$(this).find('.topic').val(),
method:$(this).find('.method').val()
});
});

showLoader('Saving Lesson...');

$.post(base_url+'lessonplanning/savePlan',{
edit_id:$('#edit_id').val(),
title:$('#lesson_title').val(),
class_id:$('#class_id').val(),
section_id:$('#section_id').val(),
subject_id:$('#subject_id').val(),
teacher_id:$('#teacher_id').val(),
details:JSON.stringify(details)
},function(res){

swal.close();

if(res.status){
    showMsg('success','Saved Successfully');
    $('#lessonModal').modal('hide');
    loadPlans();
}else{
    showMsg('error',res.msg);
}

},'json');
}

// ✅ LOAD LIST
function loadPlans(){

$('#lessonBody').html(`
<div class="text-center p-5">
<div class="spinner-border text-primary"></div>
</div>
`);

$.post(base_url+'lessonplanning/getPlans',{class_id:class_id,subject:subject,section:section},function(res){

let html='';
let colors=['primary','success','warning','info','danger'];

res.forEach((r,i)=>{

let c = colors[i%colors.length];

// 🔥 ACTION BUTTONS
let actionButtons = `
<button class="btn btn-sm btn-outline-primary" onclick="viewDetails(${r.id})">👁 Detail</button>
`;

actionButtons += `
<a href="javascript:void(0)" 
   title="LMS Management" 
   class="btn btn-sm btn-outline-info"
   onclick="openModalPopup(
       'LMS Management',
       '${base_url}academic/weekdaylms/${r.id}',
       'full-screen'
   )">
   <i class="bx bx-paperclip"></i> LMS
</a>
`;

// 📝 HOMEWORK (ONLY IF EDIT PERMISSION)
if(hasPermission(3)){  // or use parsed.is_edit_permission

actionButtons += `
<a href="javascript:void(0)" 
   title="Add / Manage Homework" 
   class="btn btn-sm btn-outline-success"
   onclick="openModalPopup(
       'Homework',
       '${base_url}academic/weekdayhw/${r.id}',
       'full-screen'
   )">
   <i class="bx bx-book-content"></i> Home work
</a>
`;
}

if(hasPermission(3)){
actionButtons += `<button class="btn btn-sm btn-outline-warning" onclick="editPlan(${r.id})">✏ Edit</button>`;
}

if(hasPermission(4)){
actionButtons += `<button class="btn btn-sm btn-outline-danger" onclick="deletePlan(${r.id})">🗑</button>`;
}

html+=`
<div class="col-md-4">
<div class="card border-${c} shadow-sm">

<div class="card-header bg-${c} text-white">${r.title}</div>

<div class="card-body">

<small><b>Teacher:</b> ${r.teacher}</small>

<div class="mt-2">
<div class="progress">
<div class="progress-bar bg-${c}" style="width:${r.completion_percentage}%"></div>
</div>
<small>${r.completion_percentage}%</small>
</div>

<div class="mt-2 d-flex justify-content-between">
<span class="badge bg-${r.status=='completed'?'success':'warning'}">${r.status}</span>
<span class="badge bg-${r.approval_status=='approved'?'success':'secondary'}">${r.approval_status}</span>
</div>

<hr>

<div class="d-flex justify-content-between">
${actionButtons}
</div>

</div>
</div>
</div>
`;

});

$('#lessonBody').html(html);

},'json');
}
// 🔥 EDIT PLAN
function editPlan(id){

    $.post(base_url+'lessonplanning/getPlanDetails',{lesson_plan_id:id},function(res){
    
    let p=res.plan;
    
    $('#lessonModal').modal('show');
    
    $('#edit_id').val(id);
    $('#lesson_title').val(p.title);
    $('#topicBody').html('');
    
    res.details.forEach(d=>{
    $('#topicBody').append(`
    <tr>
    <td><input value="${d.chapter_number}" class="form-control chapter_number"></td>
    <td><input value="${d.chapter_title}" class="form-control chapter_title"></td>
    <td><input value="${d.topic}" class="form-control topic"></td>
    <td><input value="${d.method}" class="form-control method"></td>
    <td><button class="btn btn-danger btn-sm" onclick="$(this).closest('tr').remove()">X</button></td>
    </tr>
    `);
    });
    
    },'json');
    }
// ✅ VIEW DETAILS
function viewDetails(id){

$('#viewModal').modal('show');

$.post(base_url+'lessonplanning/getPlanDetails',{lesson_plan_id:id},function(res){

let p=res.plan;

$('#lessonInfo').html(`
<h5>${p.title}</h5>
<small>Progress: ${p.completion_percentage}%</small>
<hr>
`);

let html='';

res.details.forEach(d=>{

html+=`
<div class="card p-2 mb-2">

<div class="d-flex justify-content-between">
<div>
<b>${d.chapter_title}</b><br>
<small>${d.topic}</small>
</div>

${hasPermission(3) ? `
<button class="btn btn-sm btn-primary"
onclick="openProgress(${p.id},${d.id})">+ Progress</button>` : ''}

</div>

<div id="progress_${d.id}"></div>

</div>
`;

loadProgress(d.id);

});

$('#detailBody').html(html);

// 🔥 APPROVAL CONTROL
let approvalHTML = '';

if(p.approval_status === 'pending'){

approvalHTML = `
<div class="d-flex justify-content-between align-items-center">
<div>
<b>Status:</b> <span class="badge bg-warning text-dark">Pending</span>
</div>

<div>
<button class="btn btn-success btn-sm"
onclick="approvePlan(${p.id},'approved')">Approve</button>

<button class="btn btn-danger btn-sm"
onclick="approvePlan(${p.id},'rejected')">Reject</button>

<button class="btn btn-light btn-sm" data-bs-dismiss="modal">Close</button>
</div>
</div>
`;

}else{

let color = p.approval_status === 'approved' ? 'success' : 'danger';

approvalHTML = `
<div class="d-flex justify-content-between align-items-center">
<div>
<b>Status:</b> 
<span class="badge bg-${color}">${p.approval_status.toUpperCase()}</span>
</div>

<button class="btn btn-light btn-sm" data-bs-dismiss="modal">Close</button>
</div>
`;
}

$('#approvalBox').html(approvalHTML);

},'json');
}

// ✅ LOAD PROGRESS
function loadProgress(detail_id){

$.post(base_url+'lessonplanning/getProgress',{detail_id:detail_id},function(res){

let html='';

if(res.length==0){
html = `<small class="text-muted">No progress yet</small>`;
}

res.forEach(p=>{

let progressActions = '';

if(hasPermission(3)){
progressActions += `<button class="btn btn-sm btn-outline-warning" onclick="editProgress(${p.id})">✏</button>`;
}

if(hasPermission(4)){
progressActions += `<button class="btn btn-sm btn-outline-danger" onclick="deleteProgress(${p.id})">🗑</button>`;
}

html+=`
<div class="border rounded p-2 mb-2 bg-light">

<div class="d-flex justify-content-between">
<div>
<b>${p.progress_date}</b><br>
<span class="badge bg-info">${p.completion_percentage}%</span>
</div>

<div>${progressActions}</div>
</div>

<small>${p.remark || ''}</small>

</div>
`;

});

$('#progress_'+detail_id).html(html);

},'json');
}

// ✅ OPEN PROGRESS
function openProgress(plan,detail){

$('#p_id').val('');
$('#p_plan').val(plan);
$('#p_detail').val(detail);

$('#p_percentage').val('');
$('#p_remark').val('');
$('#p_book').val('');
$('#p_page').val('');
$('#p_date').val('');
$('#p_yt').val('');
$('#p_link').val('');

$('#progressModal').modal('show');
}

// ✅ EDIT PROGRESS
function editProgress(id){

$.post(base_url+'lessonplanning/getSingleProgress',{id:id},function(p){

$('#progressModal').modal('show');

$('#p_id').val(p.id);
$('#p_plan').val(p.lesson_plan_id);
$('#p_detail').val(p.lesson_plan_detail_id);

$('#p_percentage').val(p.completion_percentage);
$('#p_remark').val(p.remark);
$('#p_book').val(p.refer_book);
$('#p_page').val(p.page_number);
$('#p_date').val(p.progress_date);
$('#p_yt').val(p.youtube_link);
$('#p_link').val(p.other_link);

},'json');
}

// ✅ DELETE PROGRESS
function deleteProgress(id){

swal({
title: "Are you sure?",
text: "This will delete the progress!",
icon: "warning",
buttons: ["Cancel", "Yes Delete"],
dangerMode: true,
}).then((ok)=>{

if(ok){
showLoader('Deleting...');

$.post(base_url+'lessonplanning/deleteProgress',{id:id},function(){
swal.close();
showMsg('success','Deleted Successfully');
viewDetails($('#p_plan').val());
loadPlans();
});
}
});
}

// ✅ SAVE PROGRESS
function saveProgress(){

if(!$('#p_percentage').val()){
showMsg('error','Enter %'); return;
}

let fd=new FormData();

fd.append('id',$('#p_id').val());
fd.append('lesson_plan_id',$('#p_plan').val());
fd.append('lesson_plan_detail_id',$('#p_detail').val());
fd.append('completion_percentage',$('#p_percentage').val());
fd.append('remark',$('#p_remark').val());

fd.append('refer_book',$('#p_book').val());
fd.append('page_number',$('#p_page').val());
fd.append('progress_date',$('#p_date').val());
fd.append('youtube_link',$('#p_yt').val());
fd.append('other_link',$('#p_link').val());

showLoader('Saving Progress...');

$.ajax({
url:base_url+'lessonplanning/saveProgress',
type:'POST',
data:fd,
processData:false,
contentType:false,
success:function(){
swal.close();
showMsg('success','Progress Saved');
$('#progressModal').modal('hide');
viewDetails($('#p_plan').val());
loadPlans();
}
});
}

// ✅ APPROVE
function approvePlan(id,status){

swal({
title: "Are you sure?",
text: "Update approval status?",
icon: "warning",
buttons: ["Cancel", "Yes"],
}).then((ok)=>{

if(ok){
showLoader('Updating...');

$.post(base_url+'lessonplanning/approvePlan',{
lesson_plan_id:id,
status:status
},function(){

swal.close();
showMsg('success','Updated');
$('#viewModal').modal('hide');
loadPlans();
});
}
});
}

// INIT
loadPlans();