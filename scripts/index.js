/**
 *
 * 全局变量保存的地方
 *
 */

var global = {};
/**
 * [DragHandler description]
 * @type {Object}
 */

var DragHandler = {
  dragEvent: function(event) {
    event = event || window.event;
    event.preventDefault();
  },
  dragOverEvent: function(event) {
    event = event || window.event;
    event.preventDefault();
  },
  dragStartEvent: function(event) {
    console.log(event);
    event = event || window.event;
    var source = event.target
    var nodeInfo = this.getNodeInfo(source);

    event.dataTransfer.setData("source-id", nodeInfo.id);
    event.dataTransfer.setData("source-class", nodeInfo.className);
    event.dataTransfer.setData("source-title", nodeInfo.title);
    event.dataTransfer.setData("source-datetime", nodeInfo.datetime);
    event.dataTransfer.setData("source-content", nodeInfo.content);
    // console.log(event.target);
  },

  dropEvent: function(event) {
    event = event || window.event;
    event.preventDefault();

    //万一掉落的不是li节点,则向上找寻LI
    var destiny = event.target;
    while (destiny.tagName.toUpperCase() != "LI") {
      destiny = destiny.parentNode;
      // console.log(node);
    };
    // var parentDom = document.getElementById("wrapper");
    console.log(destiny.id);

    //获取当前目标节点的信息
    //交换node与source

    var destinyInfo = this.getNodeInfo(destiny);
    var sourceInfo = {
      "flag": 1,
      "className": event.dataTransfer.getData("source-class"),
      "title": event.dataTransfer.getData("source-title"),
      "datetime": event.dataTransfer.getData("source-datetime"),
      "content": event.dataTransfer.getData("source-content")
    }

    this.setNodeInfo(destiny, sourceInfo);
    sourceInfo.noteid = Number(destiny.id.split("-")[1]);
    DBHandler.updateNote(destiny.id, sourceInfo);

    // destiny.className = event.dataTransfer.getData("source-class");
    // destiny.getElementsByTagName("h4")[0].innerHTML = event.dataTransfer.getData("source-title");
    // destiny.getElementsByTagName("time")[0].innerHTML = event.dataTransfer.getData("source-datetime");
    // node.getElementsByTagName("span")[0].innerHTML = event.dataTransfer.getData("source-content");

    var source = document.getElementById(event.dataTransfer.getData("source-id"));
    this.setNodeInfo(source, destinyInfo);
    destinyInfo.noteid = Number(source.id.split("-")[1]);
    DBHandler.updateNote(source.id, destinyInfo);

    // source.className = nodeInfo.className;
    // source.getElementsByTagName("h4")[0].innerHTML = nodeInfo.title;
    // source.getElementsByTagName("time")[0].innerHTML = nodeInfo.datetime;
    // source.getElementsByTagName("span")[0].innerHTML = nodeInfo.content;


    // DBHandler.updateNote(event.dataTransfer.getData("source-id"), nodeInfo);
    // DBHandler.updateNote(node.id, nodeInfo);


  },

  getNodeInfo: function(node) {
    var obj = {};

    obj.id = node.id;
    obj.className = node.className;
    obj.title = node.getElementsByTagName("h4")[0].innerHTML;
    obj.datetime = node.getElementsByTagName("time")[0].innerHTML;
    obj.content = node.getElementsByTagName("span")[0].innerHTML;
    obj.flag = 1;
    return obj;
  },

  setNodeInfo: function(node, obj) {
    node.className = obj.className;
    node.getElementsByTagName("h4")[0].innerHTML = obj.title;
    node.getElementsByTagName("time")[0].innerHTML = obj.datetime;
    node.getElementsByTagName("span")[0].innerHTML = obj.content;
    return node;
  }
};

/**
 *
 * 便签处理句柄
 * 包括如下
 * ①基本信息dbInfo
 * ②添加便签:addNote
 * ③编辑便签:updateNote
 * ④删除便签:deleteNote
 * ⑤根据index获取便签
 * ⑥查询所有的便签
 *
 */
var DBHandler = {
  dbInfo: {
    name: "aaaa",
    tableName: "mynotebook",
    keyIndex: "noteid",
    version: 1,
    db: null
  },

  init: function() {
    var self = this;
    var request = window.indexedDB.open(this.dbInfo.name, this.dbInfo.version);

    //数据库连接成功   
    request.onsuccess = function(e) {
      self.dbInfo.db = e.target.result;
      self.getAllNotes();

    };

    //数据库连接失败 
    request.onerror = function(e) {
      alert('数据库连接失败');
    };

    //数据库版本发生变化时
    request.onupgradeneeded = function(e) {
      var db = e.target.result;
      var tableName = self.dbInfo.tableName;
      var para = {
        keyPath: self.dbInfo.keyIndex,
        autoIncrement: true
      };

      //为存储创建索引
      var store = db.createObjectStore(tableName, para);
      store.createIndex("idIndex", self.dbInfo.keyIndex, {
        unique: true
      });
    };
  },

  //新增一条便签
  addNote: function(note) {
    var trans = this.dbInfo.db.transaction(this.dbInfo.tableName, "readwrite");
    var store = trans.objectStore(this.dbInfo.tableName);
    var request = store.add(note);

    request.onsuccess = function(event) {
      note.noteid = event.target.result;

      //DOM新增结点
      DOMHandler.addOneLi(note);
      alert("新增成功");

      //关闭模态窗口
      ModalHandler.clearModal();
      ModalHandler.cancelModal();
    };
    request.onerror = function(e) {};
  },

  //删除一个条便签
  delNote: function(noteid) {
    var trans = this.dbInfo.db.transaction(this.dbInfo.tableName, "readwrite");
    var store = trans.objectStore(this.dbInfo.tableName);
    var request = store.delete(noteid);

    request.onsuccess = function(event) {
      alert("删除成功");
      DOMHandler.removeLi(noteid);
    };
    request.onerror = function(e) {};
  },

  //根据noteid找寻note
  getNote: function(noteid) {
    var trans = this.dbInfo.db.transaction(this.dbInfo.tableName, "readwrite");
    var store = trans.objectStore(this.dbInfo.tableName);
    var request = store.get(noteid);
    request.onsuccess = function(event) {
      // console.log(event.target.result);
      note = event.target.result;
      ModalHandler.setColor(note.className);
      document.getElementsByClassName('input-title')[0].value = note.title;
      document.getElementsByClassName('input-content')[0].value = note.content;

      global.updateid = noteid;
      window.location.href = "#modal";

      // console.log(note)
    };
    request.onerror = function(event) {};
  },

  //编辑一条便签
  updateNote: function(noteid, note) {

    var trans = this.dbInfo.db.transaction(this.dbInfo.tableName, "readwrite");
    var store = trans.objectStore(this.dbInfo.tableName);
    var request = store.put(note);
    request.onsuccess = function(event) {
      console.log(note);
      if (note.flag !== 1) {
        console.log("come into modify dom");
        var oLi = document.getElementById("box-" + noteid);
        DOMHandler.updateLI(note, oLi);
        alert("修改成功");
        global.updateid = undefined;
        ModalHandler.cancelModal();
      }
    };
    request.onerror = function(event) {

    };

  },

  //获取所有便签
  getAllNotes: function() {
    var self = this;
    var trans = this.dbInfo.db.transaction(self.dbInfo.tableName);
    var store = trans.objectStore(this.dbInfo.tableName);
    var request = store.openCursor();

    request.onsuccess = function(e) {
      //获得游标
      var maxnodeid = 0;
      var mycur = e.target.result;
      if (mycur) {
        var idIndex = mycur.key; //sssss
        //maxnode中保存最大的nodeid，方便添加记录时产生nodeid           
        if (idIndex > maxnodeid) {
          maxnodeid = idIndex;
        }
        var note = mycur.value;
        // console.log(note);
        DOMHandler.addOneLi(note);
        // addoneli(sssss, note.title, note.content);
        mycur.continue(); //循环读取下一个
      }
    };
  }

};
DBHandler.init();





/**
 *
 * Block comment
 * 模态窗口操作相关
 * ①弹出模态窗口
 * ②编辑莫泰窗口
 * ③点击确定的过程
 * ④取消模态窗口
 * ⑤删除对话框
 */


//模态窗口操作相关
var ModalHandler = {
  openModal: function() {

    this.clearModal();
    window.location.href = "#modal";
  },
  editModal: function(event) {
    event = event || window.event;
    var noteid = Number(event.target.parentNode.parentNode.id.split("-")[1]);
    // document.getElementsByClassName("color-radio")[0].style.display = "none";
    DBHandler.getNote(noteid);

  },
  submitNote: function() {
    var title = document.getElementsByClassName("input-title")[0].value;
    var content = document.getElementsByClassName("input-content")[0].value;

    var className = this.getColor();
    // console.log(className);

    // var className = 
    var note = {
      "className": className,
      "title": title,
      "content": content,
      "datetime": new Date().toLocaleString()
    };

    if (global.updateid) {
      //修改便签
      note.noteid = global.updateid;
      DBHandler.updateNote(global.updateid, note);

    } else {
      // 新增便签
      console.log("add");
      DBHandler.addNote(note);
    }

    //如果添加成功
    // var noteid = DBHandler.addNote(note);
    // console.log(noteid);
    // DOMHandler.addOneLi(noteid, note);
  },

  cancelModal: function() {
    this.clearModal();
    // document.getElementsByClassName("color-radio")[0].style.display = "block";

    window.location.href = "#";
  },

  /**
   * [clearModal description]
   * @return {[type]} [description]
   */
  clearModal: function() {
    document.getElementsByClassName("input-title")[0].value = null;
    document.getElementsByClassName("input-content")[0].value = null;
  },

  delModal: function(event) {
    event = event || window.event;
    var noteid = Number(event.target.parentNode.parentNode.id.split("-")[1]);
    confirm("确认删除此便签？") === true ? DBHandler.delNote(noteid) : '';
  },
  getColor: function() {
    var radioObj = document.getElementsByName("color");
    for (var i = 0; i < radioObj.length; i++) {
      if (radioObj[i].checked) {
        return radioObj[i].value;
      }
    }
  },
  setColor: function(className) {
    var radioObj = document.getElementsByName("color");
    for (var i = 0; i < radioObj.length; i++) {
      if (radioObj[i].value == className) {
        radioObj[i].checked = true;
        return;
      }
    }
  }
};



/**
 *
 * DOM操作相关方法
 * ①移除一个便签DOM
 * ②更新一个便签DOM
 * ③添加一个便签
 *
 */

var DOMHandler = {
  classNames: ['style-one', 'style-two', 'style-three', 'style-four', 'style-five', 'style-six', 'style-seven'],
  init: function(note) {


  },

  //删除页面上的结点
  //根据输入的noteid进行删除
  removeLi: function(noteid) {
    var oLi = document.getElementById("box-" + noteid);
    var pNode = oLi.parentNode;
    pNode.removeChild(oLi);
  },

  //编辑后，更新li元素
  updateLI: function(note, oLi) {
    oLi.className = note.className;
    oLi.getElementsByTagName("h4")[0].innerHTML = note.title;
    oLi.getElementsByTagName("time")[0].innerHTML = note.datetime;
    oLi.getElementsByTagName("span")[0].innerHTML = note.content;
  },

  //添加一个Li
  addOneLi: function(note) {
    console.log(note);
    //新增一个li元素
    var oLi = document.createElement("li");
    oLi.id = "box-" + note.noteid;
    oLi.className = "style-default";
    // oLi.className = this.classNames[Math.round(Math.random() * (this.classNames.length))];

    // oLi.className = this.classNames[Math.random()*(this.classNames.length)];
    oLi.setAttribute("ondrag", "DragHandler.dragEvent(event)");
    oLi.setAttribute("ondragstart", "DragHandler.dragStartEvent(event)");
    oLi.setAttribute("draggable", "true");
    oLi.setAttribute("ondrop", "DragHandler.dropEvent(event)");
    oLi.setAttribute("ondragover", "DragHandler.dragOverEvent(event)");
    //定义标题元素
    var oH4 = document.createElement("h4");
    oH4.innerHTML = note.title;
    oLi.appendChild(oH4);

    //时间元素
    var oTime = document.createElement("time");
    oTime.innerHTML = note.datetime;
    oLi.appendChild(oTime);


    //内容相关
    var oSpan = document.createElement("span");
    oSpan.className = "content";
    oSpan.innerHTML = note.content;
    oLi.appendChild(oSpan);


    //右上角的设置与删除
    var oDiv = document.createElement("div");
    oDiv.className = "setting";

    var oEditImg = document.createElement("img");
    oEditImg.setAttribute("src", "./imgs/icon-edit.png");
    oEditImg.setAttribute("onclick", "ModalHandler.editModal(event)");
    oDiv.appendChild(oEditImg);

    var oDelImg = document.createElement("img");
    oDelImg.setAttribute("src", "./imgs/icon-delete.png");
    oDelImg.setAttribute("onclick", "ModalHandler.delModal(event)");
    oDiv.appendChild(oDelImg);

    oLi.appendChild(oDiv);
    oLi.style.opacity = 0;

    document.getElementById("wrapper").appendChild(oLi);
    // setTimeout(function() {
    //     oLi.style.opacity = 1;

    // }, 200);
    window.getComputedStyle(oLi).opacity;
    oLi.style.opacity = 1;
    oLi.className = note.className;

    // oLi.style.opacity=1;
    // oLi.onload=function(){
    //     console.log("i'm load");
    // }
    //右上角的设置
  }
};
