function id(el) {
	return document.getElementById(el);
}
'use strict';

// GLOBAL VARIABLES	
var db=null;
var projects=[];
var project=null;
var elements=[]; // elements in project
var element=null;
var layers=[]; // layers in current element
var layer=null;
var combiFlag=0; // used for combi layers
var materials=[]; // all defined materials
var material=null;
var materialIndex=0;
var list={};
var currentListItem=null;
var currentDialog='messageDialog';
var depth=0; // 0 is project list; 1 is element list; 2 is layer laist
var lastSave=null;
var dragStart={};
// var pseudoLayers=[];
 
// DRAG TO CHANGE DEPTH
id('main').addEventListener('touchstart', function(event) {
    dragStart.x=event.changedTouches[0].clientX;
    dragStart.y=event.changedTouches[0].clientY;
    console.log('touch start at '+dragStart.x);
})

id('main').addEventListener('touchend', function(event) {
    var drag={};
    drag.x=dragStart.x-event.changedTouches[0].clientX;
    drag.y=dragStart.y-event.changedTouches[0].clientY;
    console.log('dragged '+drag.x+'; depth: '+depth);
    if(Math.abs(drag.y)>50) return; // ignore vertical drags
    if((drag.x<-50)&&(depth>0)) { // drag right to go back...
        depth--;
        console.log('back to depth '+depth);
        if(currentDialog) showDialog(currentDialog,false);
        switch(depth) {
        	case 0:
        		loadProjects();
        		break;
        	case 1:
        		loadElements();
        		break;
        	case 2:
        		listLayers();
        }
    }
    else if(drag.x>50) { // drag left to close dialogs
    	if(currentDialog) showDialog(currentDialog,false);
    }
})

// TAP ON HEADER
id('header').addEventListener('click',function() {
	console.log('depth: '+depth);
	switch(depth) {
		case 0: // projects list - can backup/restore data
			showDialog('dataDialog',true);
			break;
		case 1: // elements list - can set project name, temperature delta & exposure category
			id('projectDialogTitle').innerText='project';
			id('projectName').value=project.name;
			id('delta').value=project.delta;
			id('exposure').value=project.exposure;
			id('saveProject').style.display='block';
			id('addProject').style.display='none';
			id('deleteProject').style.display='block';
			showDialog('projectDialog',true);
			break;
		case 2: // layers list - can rename, resize or delete element
			id('elementDialogTitle').innerText='element';
			id('elementName').value=element.name;
			// id('elementType').value=element.type;
			// id('elementType').disabled=true;
			id('elementArea').value=element.area;
			id('uVal').style.display=(element.type=='opening')?'block':'none';
			id('addElement').style.display='none';
			id('saveElement').style.display='block';
			id('deleteElement').style.display='block';
			showDialog('elementDialog',true);
	}
	
});

// DISPLAY MESSAGE
function display(message) {
	id('message').innerText=message;
	showDialog('messageDialog',true);
}

// SHOW/HIDE DIALOG
function showDialog(dialog,show) {
    console.log('show '+dialog+': '+show);
    if(currentDialog) id(currentDialog).style.display='none';
    if(show) {
        id(dialog).style.display='block';
        currentDialog=dialog;
        id('newButton').style.display='none';
    }
    else {
        id(dialog).style.display='none';
        currentDialog=null;
        id('newButton').style.display='block';
    }
}

id('newButton').addEventListener('click',function(){
	switch(depth) {
		case 0: // add new project
			id('projectDialogTitle').innerText='add new project';
			id('projectName').value='';
			id('delta').value=20;
			id('exposure').value='moderate';
			id('saveProject').style.display='none';
			id('addProject').style.display='block';
			id('deleteProject').style.display='none';
			showDialog('projectDialog',true);
			break;
		case 1: // add new element to project
			console.log('add new element to project '+project.id);
			element={};
			element.project=project.id;
			id('elementName').value=''; // set up element form
			id('elementArea').value='';
			id('uVal').style.display='none'; // overriden if choose opening element
			id('addElement').style.display='block';
			id('saveElement').style.display='none';
			id('deleteElement').style.display='none';
			showDialog('addElementDialog',true);
			break;
		case 2: // add new layer to element
			console.log('add new layer to element '+element.id);
			layer={};
			showDialog('addLayerDialog',true);
			break;
		case 3: // add new material
			console.log('add new material');
			id('materialName').value='';
			id('variable').checked=true;
			id('materialThickness').value='';
			id('materialThickness').disabled=true;
			id('suffixR').innerText=id('suffixV').innerText='ivity';
			id('unitR').innerText='mK/W';
			id('unitV').innerText='MNs/gm';
			id('materialR').value=id('materialV').value='';
			id('deleteMaterial').style.display='none';
			id('addMaterial').style.display='block';
			id('saveMaterial').style.display='none';
			showDialog('materialDialog',true);
	}
})

id('addProject').addEventListener('click',function() {
	project={};
	project.name=id('projectName').value;
	project.delta=id('delta').value;
	project.exposure=id('exposure').value;
	project.watts=0; // heat loss for project will be calculated later
	console.log('create new project, '+project.name);
	var dbTransaction=db.transaction('projects',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('projects');
	console.log("database ready");
	var addRequest=dbObjectStore.add(project);
	addRequest.onsuccess=function(event) {
		console.log('new project saved');
		showDialog('projectDialog',false);
		loadProjects();
	}
	addRequest.onerror=function(event) {
		alert('save new project failed');
	}
})
id('saveProject').addEventListener('click',function() {
	// like addProject but save instead of add to database
	project.name=id('projectName').value;
	project.delta=id('delta').value;
	project.exposure=id('exposure').value;
	var dbTransaction=db.transaction('projects',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('projects');
	console.log("database ready");
	putRequest=dbObjectStore.put(project);
	putRequest.onsuccess=function() {
		console.log('project saved');
		showDialog('projectDialog',false);
		loadProjects();
	}
	putRequest.onerror=function() {
		console.log('project save failed');
	}
})
id('deleteProject').addEventListener('click',function() {
	var dbTransaction=db.transaction('projects',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('projects');
	console.log("database ready");
	var deleteRequest=dbObjectStore.delete(project.id);
	deleteRequest.onsuccess=function(event) {
		console.log('project deleted - now delete elements');
		dbTransaction=db.transaction('elements',"readwrite");
		dbObjectStore=dbTransaction.objectStore('elements');
		for(var i in elements) {
			elDelRequest=dbObjectStore.delete(elements[i].id);
			elDelRequest.onsuccess=function(){
				console.log('element '+elements[i].id+' deleted');
			}
			elDelRequest.onerror=function(){
				console.log('element delete failed');
			}
		}
		showDialog('projectDialog',false);
		loadProjects();
	}
	deleteRequest.onerror=function(event) {
		alert('delete project failed');
	}
})

id('wall').addEventListener('click',function() {
	element.type='wall';
	id('elementDialogTitle').innerText='add new wall element';
	showDialog('elementDialog',true);
})
id('roof').addEventListener('click',function() {
	element.type='roof';
	id('elementDialogTitle').innerText='add new roof element';
	showDialog('elementDialog',true);
})
id('floor').addEventListener('click',function() {
	element.type='floor';
	id('elementDialogTitle').innerText='add new floor element';
	showDialog('elementDialog',true);
})
id('opening').addEventListener('click',function() {
	element.type='opening';
	id('elementDialogTitle').innerText='add new opening element';
	id('uVal').style.display='block'; // openings have no layers - just a U-value
	showDialog('elementDialog',true);
})

// ELEMENT
id('addElement').addEventListener('click',function() {
	element.name=id('elementName').value;
	element.area=id('elementArea').value;
	console.log('add '+element.type+' element '+element.name+' to project '+element.project);
	element.layers=[];
	console.log('create new '+element.type+' element, '+element.name+' area '+element.area+'m2');
	if(element.type!='opening') { // except openings first layer  is always...
		layer={};
		layer.m=1; // ...first (pseudo)material - inner surface
		layer.t=0; // ...no thickness...
		layer.v=0; // ...or vapour resistance
		layer.f=1; // 100% fraction
		switch(element.type) { // thermal resistance depends on element type 
			case 'wall':
				layer.r=0.15;
				break;
			case 'floor':
				layer.r=0.18;
				break;
			case 'roof':
				layer.r=0.12;
		}
		element.layers.push(layer);
		element.u=-1*element.area/layer.r; // u-value (for surfaces negative r indicates resistance)
	}
	else { // openings have specified U-value
		element.u=id('elementUval').value;
	}
	// add basic element to DB
	var dbTransaction=db.transaction('elements',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('elements');
	console.log("database ready");
	var addRequest=dbObjectStore.add(element);
	addRequest.onsuccess=function(event) {
		element.id=event.target.result;
		console.log('basic new element added to database - id: '+element.id);
		showDialog('elementDialog',false);
		depth++;
		// id('header').innerHTML=element.type+' '+element.name+'<span class="head1">%</span><span class="head2">mm</span><span class="head3">v</span><span class="head4">R</span>';
		listLayers();
	}
	addRequest.onerror=function(event) {alert('error adding new element');};
})
id('saveElement').addEventListener('click',function() {
	element.name=id('elementName').value;
	element.area=id('elementArea').value;
	if(element.type=='opening') element.u=id('elementUval').value;
	console.log('update '+element.type+' element '+element.name+' area: '+element.area+' Uvalue: '+element.u);
	var dbTransaction=db.transaction('elements',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('elements');
	console.log("database ready");
	var request=dbObjectStore.put(element);
	request.onsuccess=function(event) {
		console.log('element updated');
		showDialog('elementDialog',false);
		listLayers();
	}
})
id('deleteElement').addEventListener('click',function() {
	console.log('delete element '+element.name);
	dbTransaction=db.transaction('elements',"readwrite");
	dbObjectStore=dbTransaction.objectStore('elements');
	request=dbObjectStore.delete(element.id);
	request.onsuccess=function(event) {
		console.log('element deleted - delete layers');
		dbTransaction=db.transaction('layers',"readwrite");
		dbObjectStore=dbTransaction.objectStore('layers');
		for(var i in element.layers) {
			request=dbObjectStore.delete(element.layers[i]);
			request.onsuccess=function(event) {
				console.log('layer '+i+' deleted');
			}
		}
	}
	dbTransaction.oncomplete=function(event) {
		showDialog('elementDialog',false);
		loadElements();
	}
})

id('simple').addEventListener('click',function() {
	id('layerDialogTitle').innerText='add new simple layer';
	combiFlag=0;
	id('material').value=0;
	id('thickness').value='';
	id('fractionLine').style.display='none';
	id('addLayer').style.display='block';
	id('saveLayer').style.display='none';
	id('deleteLayer').style.display='none';
	showDialog('layerDialog',true);
})
id('combi').addEventListener('click',function() {
	id('layerDialogTitle').innerText='add new combi layer';
	combiFlag=1; // signal first combi material
	id('material').value=0;
	id('thickness').value='';
	id('fraction').value=0;
	id('fractionLine').style.display='block';
	id('fractionLine').disabled=false;
	id('addLayer').style.display='block';
	id('saveLayer').style.display='none';
	id('deleteLayer').style.display='none';
	showDialog('layerDialog',true);
})
id('material').addEventListener('change',function() {
	var m=id('material').value;
	console.log('material: '+m);
	var i=0;
	var found=false;
	while(i<materials.length&!found) {
		if(materials[i].id==m) found=true;
		else i++;
	}
	material=materials[i];
	console.log('material selected: '+material.name);
	if(material.t<0) {
		id('thickness').value='';
		id('thickness').disabled=false;
	}
	else {
		id('thickness').value=-1*material.t;
		id('thickness').disabled=true;
		layer.t=-1*material.t/1000; // metres
	}
	layer.m=m;
})
id('materialsButton').addEventListener('click',function() {
	showDialog('layerDialog',false);
	listMaterials();
})
id('addLayer').addEventListener('click',function() {
	/*
	var n=id('material').value; // id of selected material
	console.log('material.id is '+n);
	var i=0;
	var found=false;
	while(i<materials.length&!found) {
		if(materials[i].id==n) found=true;
		else i++;
	}
	material=materials[i];
	console.log('material selected: '+material.name);
	layer={};
	layer.m=material.id;
	*/
	if(layer.t==null) layer.t=id('thickness').value/1000; // convert mm to m
	layer.r=material.r;
	if(layer.r<0) layer.r=-1*layer.r; // negative r - resistance
	else layer.r*=layer.t; // resistance depends on layer thickness
	layer.r=Math.round(layer.r*1000)/1000;
	layer.v=material.v; // ADJUST FOR THICKNESS?
	if(layer.m==6) { // outer surface - adjust resistance
		console.log('outer surface - adjust R for element type and exposure');
		layer.t=0; // ...no thickness...
		layer.v=0; // ...or vapour resistance
		layer.f=1; // 100% fraction
		switch(element.type) { // thermal resistance depends on element type 
			case 'wall':
				switch(project.exposure) {
					case 'sheltered':
						layer.r=0.09;
						break;
					case 'moderate':
						layer.r=0.06;
						break;
					case 'exposed':
						layer.r=0.03;
				}
				break;
			case 'floor':
				layer.r=0.09;
				break;
			case 'roof':
				switch(project.exposure) {
					case 'sheltered':
						layer.r=0.08;
						break;
					case 'moderate':
						layer.r=0.05;
						break;
					case 'exposed':
						layer.r=0.02;
				}
		}
	}
	// DEAL WITH m=5 GROUND - CALCULATE FROM AREA/PERIMETER
	if(combiFlag>0) {
		layer.f=id('fraction').value/100;
		if(combiFlag==1) combiFlag=layer.f; // remember fraction of 1st combi material
		else combiFlag=0; // second combi material if combiFlag<1
	}
	else layer.f=1;
	console.log('add layer '+material.name+'; thickness: '+layer.t+'m; resistance: '+layer.r);
	element.layers.push(layer);
	var dbTransaction=db.transaction('elements',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('elements');
	console.log("database ready to update element "+element.id);
	var addRequest=dbObjectStore.put(element);
	addRequest.onsuccess=function(event) {
		console.log('element updated');
		if(combiFlag>0) { // first of 2 combi materials - set up for 2nd - same thickness,...
			id('fraction').value=(1-combiFlag)*100; // ...complimentary fraction...
			id('fraction').disabled=true; // ...cannot change...
			id('material').value=0; // ...reset material
		}
		else { // for simple layers, that's it - refresh layer list
			showDialog('layerDialog',false);
			listLayers();
		}
	}
	addRequest.onerror=function(event) {alert('error updating element');};
	// listLayers();
})
id('saveLayer').addEventListener('click',function() {
	var n=id('material').value; // id of selected material
	console.log('material.id is '+n);
	var i=0;
	var found=false;
	while(i<materials.length&!found) {
		if(materials[i].id==n) found=true;
		else i++;
	}
	material=materials[i];
	console.log('material selected: '+material.name);
	layer.m=material.id;
	layer.t=id('thickness').value/1000; // convert mm to m
	layer.r=material.r;
	if(layer.r<0) layer.r=-1*layer.r; // negative r - resistance
	else layer.r*=layer.t; // resistance depends on layer thickness
	layer.r=Math.round(layer.r*1000)/1000;
	layer.v=material.v; // ADJUST FOR THICKNESS?
	if(layer.m==6) { // outer surface - adjust resistance
		console.log('outer surface - adjust R for element type and exposure');
		layer.t=0; // ...no thickness...
		layer.v=0; // ...or vapour resistance
		layer.f=1; // 100% fraction
		switch(element.type) { // thermal resistance depends on element type 
			case 'wall':
				switch(project.exposure) {
					case 'sheltered':
						layer.r=0.09;
						break;
					case 'moderate':
						layer.r=0.06;
						break;
					case 'exposed':
						layer.r=0.03;
				}
				break;
			case 'floor':
				layer.r=0.09;
				break;
			case 'roof':
				switch(project.exposure) {
					case 'sheltered':
						layer.r=0.08;
						break;
					case 'moderate':
						layer.r=0.05;
						break;
					case 'exposed':
						layer.r=0.02;
				}
		}
	}
	// DEAL WITH m=5 GROUND - CALCULATE FROM AREA/PERIMETER
	element.layers[layer.n]=layer; // update in element layers[] array
	showDialog('layerDialog',false);
	listLayers();
})
id('deleteLayer').addEventListener('click',function() {
	
})

function setOption(opt) {
	console.log('thickness option: '+opt.value);
	material.thickness=opt.value;
	id('materialThickness').disabled=(opt.value!=1);
	id('materialThickness').value=(opt.value==0)?'0':'';
	id('suffixR').innerText=id('suffixV').innerText=(opt.value<0)?'ivity':'ance';
	id('unitR').innerText=(opt.value<0)?'m2K/W':'mK/W';
	id('unitV').innerText='???'; // SET UNITS
}

id('addMaterial').addEventListener('click',function() {
	console.log('add new material to database');
	material={};
	material.name=id('materialName').value;
	if(id('variable').checked) { // variable thickness
		material.t=-1;
		material.r=id('materialR').value;
		material.v=id('materialV').value;
	}
	else if(id('membrane').checked) { // negligible thickness
		material.t=0;
		material.r=-1*id('materialR').value;
		material.v=-1*id('materialV').value;
	}
	else { // defined thickness
		material.t=id('materialThickness').value; // mm
		material.r=-1*id('materialR').value;
		material.v=-1*id('materialV').value;
	}
	var dbTransaction=db.transaction('materials',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('materials');
	console.log("database ready to add "+material.name);
	var addRequest=dbObjectStore.add(material);
	addRequest.onsuccess=function(event) {
		var n=event.target.result;
		console.log('material added - id: '+n);
		material.id=n;
		materials.push(material);
		showDialog('materialDialog',false);
	}
	addRequest.onerror=function(event) {alert('error adding material');};
})
id('saveMaterial').addEventListener('click',function() {
	console.log('update material in database');
	material.name=id('materialName').value;
	if(id('variable').checked) { // variable thickness
		material.t=-1;
		material.r=id('materialR').value;
		material.v=id('materialV').value;
	}
	else if(id('membrane').checked) { // negligible thickness
		material.t=0;
		material.r=-1*id('materialR').value;
		material.v=-1*id('materialV').value;
	}
	else { // defined thickness
		material.t=id('materialThickness').value; // mm
		material.r=-1*id('materialR').value;
		material.v=-1*id('materialV').value;
	}
	var dbTransaction=db.transaction('materials',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('materials');
	console.log("database ready to update "+material.name);
	var request=dbObjectStore.put(material);
	request.onsuccess=function(event) {
		console.log('material updated');
		materials[materialIndex]=material;
		showDialog('materialDialog',false);
	}
	addRequest.onerror=function(event) {alert('error updating material');};
})
id('deleteMaterial').addEventListener('click',function() {
	console.log('delete material '+material.name);
	dbTransaction=db.transaction('materials',"readwrite");
	dbObjectStore=dbTransaction.objectStore('materials');
	request=dbObjectStore.delete(material.id);
	request.onsuccess=function(event) {
		console.log('material deleted');
		showDialog('materialDialog',false);
	}
	request.onerror=function(event) {alert('unable to delete material');}
})

function seedMaterials() {
	console.log('seed with basic materials');
	materials=[{'name':'inner surface','r':0.1,'v':0,'t':0},
		{'name':'ventilated cavity','r':-0.15,'v':0,'t':-1},
		{'name':'closed cavity','r':-0.25,'v':0,'t':-1},
		{'name':'unheated space','r':-0.5,'v':0,'t':0},
		{'name':'ground','r':0.1,'v':0,'t':0},
		{'name':'outer surface','r':0.1,'v':0,'t':0},
		{'name':'concrete','r':0.69,'v':200,'t':-1},
		{'name':'concrete - lightweight','r':2.4,'v':50,'t':-1},
		{'name':'thermal concrete blockwork','r':4.5,'v':50,'t':-1},
		{'name':'brick (outer leaf)','r':1.19,'v':50,'t':-1},
		{'name':'stone','r':0.7,'v':50,'t':-1},
		{'name':'plaster - lightweight','r':6.24,'v':50,'t':-1},
		{'name':'plasterboard','r':6.24,'v':50,'t':-1},
		{'name':'timber','r':6.93,'v':50,'t':-1},
		{'name':'plywood','r':6.93,'v':1500,'t':-1},
		{'name':'osb','r':7.7,'v':1000,'t':-1},
		{'name':'fibreboard','r':16,'v':25,'t':-1},
		{'name':'glass','r':0.95,'v':50000,'t':-1},
		{'name':'breather membrane','r':0,'v':0.1,'t':0},
		{'name':'polythene','r':0,'v':500,'t':0},
		{'name':'metal foil','r':0,'v':10000,'t':0},
		{'name':'mineral wool','r':25.6,'v':1,'t':-1},
		{'name':'expanded polystyrene','r':27.7,'v':200,'t':-1},
		{'name':'foamed polyurethene','r':38.5,'v':100,'t':-1},
		{'name':'polyisocyanurate','r':45,'v':150,'t':-1},
		{'name':'cement render','r':0.83,'v':100,'t':-1},
		{'name':'silicon render','r':1.1,'v':150,'t':-1},
		{'name':'single-ply roofing','r':-0.0015,'v':-25,'t':1.2},
		{'name':'roof tiles + battens','r':-0.16,'v':0,'t':-1}];
		// r<0: r=-R thermal resistance*-1; v<0: v=-V vapour resistance*-1; t=-1: variable thickness
	console.log('save '+materials.length+' seed materials');
	var dbTransaction=db.transaction('materials',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('materials');
	for(var i in materials) {
		console.log('save material '+i+': '+materials[i].name);
		request=dbObjectStore.add(materials[i]);
		request.onsuccess=function(event) {
			console.log(materials[i].name+' saved');
		}
		request.onerror=function(event) {alert('failed to save '+materials[i].name);}
	}
}
function loadMaterials() {
	console.log('load materials');
	var opt=null;
	materials=[];
	id('material').innerHTML=''; // clear and repopulate materials selector
	var count=0;
	var dbTransaction=db.transaction('materials',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('materials');
	request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {
		var cursor=event.target.result;
		if(cursor) {
			materials.push(cursor.value);
			console.log("material id: "+cursor.value.id+"; resistance: "+cursor.value.r+"; "+cursor.value.name);
			opt=document.createElement('option');
			opt.value=cursor.value.id;
			opt.innerText=cursor.value.name;
			id('material').appendChild(opt);
			count++;
			cursor.continue ();
		}
		else {
			console.log(count+' materials loaded');
			if(count<1) {
				seedMaterials();
				display('materials database seeded - restart');
			}
			loadProjects();
		}
	}
	request.onerror=function(event) {
		alert('failed to load materials');
	}
}
		
function loadProjects() {
	projects=[];
	var dbTransaction=db.transaction('projects',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('projects');
	request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {
		var cursor=event.target.result;
		if(cursor) {
			projects.push(cursor.value);
			console.log("project id: "+cursor.value.id+"; "+cursor.value.name);
			cursor.continue();
		}
		else {
			console.log("No more projects! "+projects.length+" loaded");
			depth=0;
			if(projects.length<1) { // no data: restore backup?
				console.log("no data - restore backup?");
				showDialog('importDialog',true);
			}
			else { // monthly backups
				var today=new Date();
				console.log('this month: '+today.getMonth()+"; last save: "+lastSave);
				if(today.getMonth()!=lastSave) backup();
			}
			listProjects();
		}
	}
	request.onerror=function(event) {
		alert('loading materials failed');
	}
}

function listProjects() {
	var listItem;
	id('headerTitle').innerText='Watt';
	id('headerValue').innerText='';
	id('headerKey').innerHTML='<div class="tabL">projects</div><div class="tabR">kW</div>';
	id("list").innerHTML=""; // clear list
	for(var i in projects) {
		project=projects[i];
		listItem=document.createElement('li');
		listItem.index=i;
		listItem.innerHTML='<div class="tabText">'+trim(project.name,25)+'</div><div class="tabR">'+Math.round(project.watts/100)/10+'</div><br>';
		listItem.addEventListener('click',function() {
			project=projects[this.index];
			depth=1;
			// id('headerTitle').innerText=project.name;
			// depth++;
			loadElements();
		})
		id('list').appendChild(listItem);
	}
}

function loadElements() {
	project.watts=0;
	elements=[];
	console.log('load elements for project '+project.id+' ('+project.name+')');
	var dbTransaction=db.transaction('elements',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('elements');
	request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {
		var cursor=event.target.result;
		if(cursor) {
			if(cursor.value.project==project.id) {
				elements.push(cursor.value);
				console.log("element id: "+cursor.value.id+"; type: "+cursor.value.type+"; "+cursor.value.name);
			}
			cursor.continue ();
		}
		else {
			console.log("No more elements! "+elements.length+" loaded");
			listElements();
		}
	}
	request.onerror=function(event) {alert('no elements loaded');}
}

function listElements() {
	console.log('list '+elements.length+' elements for project '+project.id);
	var listItem;
	id("list").innerHTML=""; // clear list
	id('headerTitle').innerHTML=project.name;
	var html='<div class="tabL">element</div>';
	html+='<div class="tab3">m2</div>';
	html+='<div class="tab4">U</div>';
	html+='<div class="tabR">W</div>';
	id('headerKey').innerHTML=html;
	var watts=0;
	for(var i in elements) {
		element=elements[i];
		listItem=document.createElement('li');
		listItem.index=i;
		html='<div class="tab0">'+trim(element.name,12)+'</div>';
		html+='<div class="tab3">'+Math.round(element.area)+'</div>';
		html+='<div class="tab4">'+element.u+'</div>';
		html+='<div class="tabR">'+Math.round(element.u*element.area*project.delta)+'</div><br>';
		listItem.innerHTML=html;
		watts+=element.area*element.u*project.delta;
		console.log('element: '+element.name+'; area: '+element.area+'; U-value: '+element.u+'; heat loss: '+element.area*element.u*project.delta+'W');
		listItem.addEventListener('click',function() {
			element=elements[this.index];
			console.log('show element id '+element.id);
			if(element.type=='opening') {
				id('elementName').value=element.name;
				id('elementArea').value=element.area;
				id('elementUval').value=element.u;
				id('deleteElement').style.display='block';
				id('addElement').style.display='none';
				id('saveElement').style.display='block';
				showDialog('elementDialog',true);
			}
			else {
				depth=2;
				listLayers();
			}
		})
		id('list').appendChild(listItem);
	}
	project.watts=watts;
	console.log('project heat loss: '+watts+'W');
	var dbTransaction=db.transaction('projects',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('projects');
	console.log("database ready");
	putRequest=dbObjectStore.put(project);
	putRequest.onsuccess=function() {
		console.log('project updated');
	}
	putRequest.onerror=function() {
		alert('project save failed');
	}
	id('headerValue').innerText=Math.round(watts/100)/10+'kW';
}

function listLayers() {
	var listItem;
	console.log('list layers for element '+element.name+' area: '+element.area+'; u=value: '+element.u);
	id('headerTitle').innerHTML=element.name;
	var html='<div class="tabL">mm</div>';
	html+='<div class="tab1">%</div>';
	html+='<div class="tabR">R</div>';
	id('headerKey').innerHTML=html;
	id("list").innerHTML=""; // clear list
	var material=null;
	var a=null; // a & b are two materials of combi layers
	var aLayers=[];
	var bLayers=[];
	var simples=[]; // simple layers
	for(var i in element.layers) {
		layer=element.layers[i];
		layer.n=i;
		var j=0;
		var found=false;
		// console.log('get material '+layer.m);
		while(j<materials.length&!found) {
			// console.log('materials['+j+'] id: '+materials[j].id);
			if(materials[j].id==layer.m) found=true;
			else j++;
		}
		material=materials[j];
		console.log('material: '+material);
		listItem=document.createElement('li');
		listItem.index=i;
		html='<div class="tabL">'+layer.t*1000+'</div>';
		html+='<div class="tab1">';
		if(layer.f<1) html+=Math.round(layer.f*100);
		html+='</div>';
		html+='<div class="tab2">';
		var name=trim(material.name,13);
		if(layer.f<1) html+='<i>'+name+'</i></div>';
		else html+=name+'</div>';
		html+='<div class="tabR">';
		console.log('layer '+i+' thickness: '+layer.t+'m - r: '+layer.r);
		console.log('layer '+i+' R: '+layer.r);
		html+=layer.r+'</div><br>';
		listItem.innerHTML=html;
		listItem.addEventListener('click',function() {
			layer=element.layers[this.index];
			// console.log('show layer '+layer.n);
			// console.log('material.id: '+layer.m+' '+layer.t/1000+'mm thick '+layer.f*100+'%');
			id('material').value=layer.m; // select material
			id('thickness').value=layer.t*1000; // mm
			id('fraction').value=(layer.f<1)?layer.f*100:'';
			id('fractionLine').disabled=true;
			id('addLayer').style.display='none';
			id('saveLayer').style.display='block';
			id('deleteLayer').style.display='block';
			showDialog('layerDialog',true);
		});
		id('list').appendChild(listItem);
		if(layer.f==1) {
			simples.push(i); // most layers go in the simple layers list
			console.log('layer '+i+' added to simples');
		}
		else { // combi layer
			if(a===null) a=i; // save first combi layer material
			else {
				if(layer.r>element.layers[a].r) { // second combi layer (b) is insulation
					aLayers.push(i);
					bLayers.push(a);
					console.log('second combi layer is insulation');
				}
				else { // first combi layer (a) is insulation
					aLayers.push(a);
					bLayers.push(i);
					console.log('first combi layer is insulation');
				}
				a=null;
			}
		}
	}
	console.log(element.layers.length+' layers; '+aLayers.length+' combi layers; '+simples.length+' simple layers');
	var text='aLayers: ';
	for(i in aLayers) {text+=aLayers[i]+'/';}
	console.log(text);
	text='bLayers: ';
	for(i in bLayers) {text+=bLayers[i]+'/';}
	console.log(text);
	text='simple layers: ';
	console.log('first simple layer: '+simples[0]);
	for(i in simples) {text+=simples[i]+'/';}
	console.log(text);
	// after listing layers, calculate U-value
	var totalR=0;
	var Ra=0;
	var Rb=0;
	var upperR=0;
	var lowerR=0;
	var combiR=0;
	for(i=0;i<simples.length;i++) { // for each simple layer
		Ra+=element.layers[simples[i]].r;
	}
	Rb=lowerR=Ra; // sums equal at this stage
	console.log('simple layers total resistance: '+Ra);
	for(i=0;i<aLayers.length;i++) { // for each combi layer pair...
		 Ra+=element.layers[aLayers[i]].r;
		 Rb+=element.layers[bLayers[i]].r;
	}
	console.log('Ra: '+Ra+'; Rb: '+Rb);
	for(i=0;i<aLayers.length;i++) {
		 upperR+=1/(element.layers[aLayers[i]].f/Ra+element.layers[bLayers[i]].f/Rb);
		 combiR+=1/(element.layers[aLayers[i]].f/element.layers[aLayers[i]].r+element.layers[bLayers[i]].f/element.layers[bLayers[i]].r);
	}
	console.log('upperR: '+upperR+'; combiR: '+combiR);
	lowerR+=combiR;
	totalR=(upperR+lowerR)/2;
	console.log('lowerR: '+lowerR+'; totalR: '+totalR);
	element.u=1/totalR;
	console.log('element U-value: '+element.u);
	element.u=Math.round(element.u*100)/100;
	id('headerValue').innerHTML='U:'+element.u;
}

function listMaterials() {
	console.log('list materials');
	depth=3;
	id('headerTitle').innerText='Watt';
	id('headerValue').innerText='';
	id('headerKey').innerText='materials';
	id("list").innerHTML=""; // clear list
	var listItem;
	for(var i=6;i<materials.length;i++) { // skipping 'pseudo' materials, list others
		material=materials[i];
		listItem=document.createElement('li');
		listItem.index=i;
		listItem.innerText=material.name;
		listItem.addEventListener('click',function() {
			material=materials[this.index];
			materialIndex=this.index;
			id('materialName').value=material.name;
			id('materialThickness').disabled=true; // default settings
			id('materialThickness').value='';
			id('suffixR').innerText=id('suffixV').innerText='ance';
			id('unitR').innerText='m2K/W';
			id('unitV').innerText='MNs/g';
			if(material.t<0) { // variable thickness
				id('materialThickness').disabled=true;
				id('variable').checked=true;
				id('suffixR').innerText=id('suffixV').innerText='ivity';
				id('unitR').innerText='mK/W';
				id('unitV').innerText='MNs/gm';
			}
			else if(material.t>0) { // defined thickness
				id('materialThickness').disabled=false;
				id('materialThickness').value=material.t*1000; // mm
				id('defined').checked=true;
			}
			else id('membrane').checked=true; // negligible thickness
			id('materialR').value=material.r;
			id('materialV').value=material.v;
			id('deleteMaterial').style.display='block';
			id('addMaterial').style.display='none';
			id('saveMaterial').style.display='block';
			showDialog('materialDialog',true);
		})
		id('list').appendChild(listItem);
	}
}

// DATA
id('dataBackup').addEventListener('click',function() {showDialog('dataDialog',false); backup();});
id('dataImport').addEventListener('click',function() {showDialog('importDialog',true)});
/*
id('dataCancel').addEventListener('click',function() {showDialog('dataDialog',false)});
*/
// RESTORE BACKUP
id("fileChooser").addEventListener('change', function() {
	var file=id('fileChooser').files[0];
	console.log("file: "+file+" name: "+file.name);
	var fileReader=new FileReader();
	fileReader.addEventListener('load', function(evt) {
		console.log("file read: "+evt.target.result);
	  	var data=evt.target.result;
		var json=JSON.parse(data);
		console.log("json: "+json);
		var items=json.items;
		console.log(items.length+" items loaded");
		var dbTransaction=db.transaction('items',"readwrite");
		var dbObjectStore=dbTransaction.objectStore('items');
		for(var i=0;i<items.length;i++) {
			console.log("save "+items[i].text);
			var request=dbObjectStore.add(items[i]);
			request.onsuccess=function(e) {
				console.log(items.length+" items added to database");
			};
			request.onerror=function(e) {alert("error adding item");};
		}
		showDialog('importDialog',false);
		display("data imported - restart");
  	});
  	fileReader.readAsText(file);
});

/* CANCEL RESTORE
id('cancelImport').addEventListener('click', function() {
    showDialog('importDialog',false);
});
*/
// BACKUP
function backup() {
  	console.log("EXPORT");
	var fileName="watt";
	var date=new Date();
	fileName+=date.getFullYear();
	var num=date.getMonth()+1;
	if(num<10) fileName+='0';
	fileName+=num;
	num=date.getDate();
	if(num<10) fileName+='0';
	fileName+=num+".json";
	var dbTransaction=db.transaction('projects',"readwrite");
	var dbObjectStore=dbTransaction.objectStore('projects');
	console.log("database ready");
	var projects=[];
	var request=dbObjectStore.openCursor();
	request.onsuccess=function(event) {  
		var cursor=event.target.result;  
    		if(cursor) { // read in every item
			    projects.push(cursor.value);
			    cursor.continue();  
    		}
		else {
			console.log(projects.length+" projects");
			var data={'projects': projects};
			// ********* NEED TO ADD elements, layers & materials ********
			var json=JSON.stringify(data);
			var blob=new Blob([json], {type:"data:application/json"});
  			var a=document.createElement('a');
			a.style.display='none';
    		var url=window.URL.createObjectURL(blob);
			console.log("data ready to save: "+blob.size+" bytes");
   			a.href=url;
   			a.download=fileName;
    		document.body.appendChild(a);
    		a.click();
			display(fileName+" saved to downloads folder");
			var today=new Date();
			lastSave=today.getMonth();
			window.localStorage.setItem('lastSave',lastSave); // remember month of backup
		}
	}
}

//UTILITY FUNCTIONS
function trim(text,len) {
	if(text.length>len) return(text.substr(0,len-2)+'..');
	else return text;
	
}

/* BUILD LIST OF PSEUDO LAYERS
function listPseudoLayers() {
	var names=['inner surface','ventilated cavity','unventilated cavity','outer surface','ground'];
	var opt=null;
	for(var i in names) {
		layer={};
		layer.name=names[i];
		layer.t=layer.r=layer.v=0;
		layer.f=1;
		pseudoLayers.push(layer);
		opt=document.createElement('option');
		opt.value=names[i];
		opt.innerText=names[i];
		id('pseudoLayers').appendChild(opt);
	}
	console.log(pseudoLayers.length+' pseudoLayers listed');
}
*/

// START-UP CODE
lastSave=window.localStorage.getItem('lastSave');
console.log("last save: "+lastSave);
// load items from database
var request=window.indexedDB.open("wattDB",2);
request.onsuccess=function (event) {
	db=event.target.result;
	console.log("DB open");
	loadMaterials();
};
// ***** DELETE layers OBJECT STORE ******
request.onupgradeneeded=function(event) {
	if(!db.objectStoreNames.contains('projects')) {
		dbObjectStore=event.currentTarget.result.createObjectStore("projects",{
			keyPath:'id',autoIncrement: true});
			console.log("projects store created");
	}
	else console.log("projects store exists");
	if(!db.objectStoreNames.contains('elements')) {
		dbObjectStore=event.currentTarget.result.createObjectStore("elements",{
		keyPath:'id',autoIncrement: true});
		console.log("elements store created");
	}
	else console.log("elements store exists");
	if(!db.objectStoreNames.contains('materials')) {
		dbObjectStore=event.currentTarget.result.createObjectStore("materials",{
		keyPath:'id',autoIncrement: true});
		console.log("materials store created");
	}
	else {
		console.log("materials store exists");
		var transaction=db.transaction('materials');
		var objectStore=transaction.objectStore('materials');
		var clearRequest=objectStore.clear();
		clearRequest.onsuccess=console.log('materials store emptied');
		clearRequest.onerror=alert('unable to clear materials store');
	}
	/* old code...
	dbObjectStore=event.currentTarget.result.createObjectStore("elements",{
		keyPath:'id',autoIncrement: true
	});
	console.log("elements database ready");
	dbObjectStore=event.currentTarget.result.createObjectStore("materials",{
		keyPath:'id',autoIncrement: true
	});
	console.log("materials database ready");
	*/
}
request.onerror=function(event) {
	display("indexedDB error code "+event.target.errorCode);
};
	
// implement service worker if browser is PWA friendly
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
} else { //Register the ServiceWorker
	navigator.serviceWorker.register('wattSW.js', {
		scope: '/watt/'
	}).then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}
