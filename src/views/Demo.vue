<template>
    <div class="app">
      <!-- 工具栏 -->
      <div class="toolbar">
        <el-button @click="showJsonModal">JSON</el-button>
        <el-button @click="onImportJSON">导入</el-button>
        <el-button @click="onExportJSON">导出</el-button>
        <el-button @click="undo">撤消</el-button>
        <el-button @click="clearCanvas">清空画布</el-button>
        <el-button @click="saveToLocalStorage">保存</el-button>
        <el-button @click="togglePreviewMode">{{ previewMode ? '退出预览' : '预览' }}</el-button> 
      </div>
      <div class="canvas-size-control">
            <label for="canvasWidth">画布大小：</label>
            <input id="canvasWidth" type="number" v-model="canvasWidth" placeholder="宽度">
            <span>*</span>
            <input id="canvasHeight" type="number" v-model="canvasHeight" placeholder="高度">
            <el-button type="primary" @click="updateCanvasSize">更新</el-button>
        </div>
  
      <!-- 组件列表 -->
      <div class="component-list">
        <div
          v-for="(item, index) in componentList"
          :key="index"
          class="draggable"
          draggable="true"
          @dragstart="handleDragStart(index)"
          :style="item.style"
        >
          {{ item.name }}
        </div>
      </div>
  
      <!-- 画布 -->
      <div class="canvas" ref="canvas" @drop="handleDrop" @dragover="handleDragOver">

        <div
  v-for="(component, index) in canvasComponents"
  :key="component.id"
  class="draggable rectangle"
  :style="{ ...component.style, position: 'absolute', transform: `rotate(${component.rotation || 0}deg)` }"
  :class="{ 'no-events': previewMode }"
  draggable="true"
  @dragstart="handleCanvasDragStart(index)"
  @mousedown="handleMouseDown(index, $event)"
  @contextmenu.prevent="showContextMenu($event, index)"
>
  {{ component.name }}
  <div class="resize-handle top-left" @mousedown.stop="handleResizeStart(index, 'top-left', $event)"></div>
  <div class="resize-handle top-right" @mousedown.stop="handleResizeStart(index, 'top-right', $event)"></div>
  <div class="resize-handle bottom-left" @mousedown.stop="handleResizeStart(index, 'bottom-left', $event)"></div>
  <div class="resize-handle bottom-right" @mousedown.stop="handleResizeStart(index, 'bottom-right', $event)"></div>
  <div class="rotate-handle" @mousedown.stop="handleRotateStart(index, $event)"></div>
</div>
          <!-- 右击菜单 -->
          <div
                    v-show="contextMenuVisible"
                    class="context-menu"
                    :style="contextMenuStyle"
                    >
                    <div
                        v-for="(action, index) in contextMenuActions"
                        :key="index"
                        class="context-menu-item"
                        @click="handleContextMenuAction(action.action)"
                    >
                        {{ action.text }}
                    </div>
                    </div>

      </div>
                 
      <!-- JSON 弹窗 -->
      <DemoModel
        v-if="isJsonModalVisible"
        :json-content="jsonContent"
        @close="isJsonModalVisible = false"
        @save-json="handleSaveJson"
      />
  
      <!-- 导入导出 JSON 弹窗 -->
      <el-dialog
        :title="isExport ? '导出数据' : '导入数据'"
        :visible.sync="isShowDialog"
        :close-on-press-escape="false"
        :close-on-click-modal="false"
        width="600"
      >
        <el-input
          v-model="jsonData"
          type="textarea"
          :rows="20"
          placeholder="请输入 JSON 数据"
        ></el-input>
        <div slot="footer" class="dialog-footer">
          <el-button @click="isShowDialog = false">取消</el-button>
          <el-upload
            v-show="!isExport"
            action="/"
            :before-upload="beforeUpload"
            :show-file-list="false"
            accept="application/json"
          >
            <el-button type="primary">选择 JSON 文件</el-button>
          </el-upload>
          <el-button type="primary" @click="processJSON">确定</el-button>
        </div>
      </el-dialog>
    </div>
  </template>
  
  <script>
  import { deepCopy } from "@/utils/utils";
  import generateID from "@/utils/generateID";
  import DemoModel from "@/views/DemoModel.vue"; // 确保路径正确
  
  export default {
    components: {
      DemoModel, // 确保在组件中注册
    },
    data() {
      return {
        initialRotation: 0,
        resizingComponentIndex: null,
    resizingHandle: null,
    rotatingComponentIndex: null,
    startX: 0,
    startY: 0,
    originalWidth: 0,
    originalHeight: 0,
    originalLeft: 0,
    originalTop: 0,
    centerX: 0,
    centerY: 0,
    startAngle: 0,
        contextMenuVisible: false,
    contextMenuStyle: {
      top: '0px',
      left: '0px',
    },
    contextMenuActions: [
      { text: '删除', action: 'delete' },
      { text: '复制', action: 'copy' },
      { text: '粘贴', action: 'paste' },
      { text: '剪切', action: 'cut' },
      // 可以添加更多的操作，比如粘贴、剪切等
    ],
    contextMenuTargetIndex: -1,
        canvasWidth: 800,  // 默认宽度
        canvasHeight: 600, // 默认高度
        previewMode: false,
        componentList: [
          {
            id: 1,
            name: "Rectangle",
            style: {
              width: "150px",
              height: "30px",
              border: "1px solid black",
            },
          },
          // 其他组件注释掉了
        ],
        canvasComponents: [],
        draggingComponentIndex: null,
        startX: 0,
        startY: 0,
        initialLeft: 0,
        initialTop: 0,
        isDraggingFromCanvas: false, // 新增标志变量
        isJsonModalVisible: false,
        jsonContent: "", // 存储 JSON 内容
        isShowDialog: false, // 导入导出 JSON 弹窗可见性
        jsonData: "", // JSON 数据
        isExport: false, // 是否是导出操作
        snapshotData: [],   // 存储历史快照数据
        snapshotIndex: -1,  // 当前快照索引，表示当前展示的是第几个快照
      };
    },
    methods: {
        handleResizeStart(index, handle, event) {
    this.resizingComponentIndex = index;
    this.resizingHandle = handle;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.originalWidth = parseInt(this.canvasComponents[index].style.width, 10);
    this.originalHeight = parseInt(this.canvasComponents[index].style.height, 10);
    this.originalLeft = parseInt(this.canvasComponents[index].style.left, 10);
    this.originalTop = parseInt(this.canvasComponents[index].style.top, 10);
    
    document.addEventListener('mousemove', this.handleResizeMove);
    document.addEventListener('mouseup', this.handleResizeEnd);
  },
  
  handleResizeMove(event) {
    if (this.resizingComponentIndex !== null) {
      const dx = event.clientX - this.startX;
      const dy = event.clientY - this.startY;
      const component = this.canvasComponents[this.resizingComponentIndex];

      switch (this.resizingHandle) {
        case 'top-left':
          component.style.width = `${this.originalWidth - dx}px`;
          component.style.height = `${this.originalHeight - dy}px`;
          component.style.left = `${this.originalLeft + dx}px`;
          component.style.top = `${this.originalTop + dy}px`;
          break;
        case 'top-right':
          component.style.width = `${this.originalWidth + dx}px`;
          component.style.height = `${this.originalHeight - dy}px`;
          component.style.top = `${this.originalTop + dy}px`;
          break;
        case 'bottom-left':
          component.style.width = `${this.originalWidth - dx}px`;
          component.style.height = `${this.originalHeight + dy}px`;
          component.style.left = `${this.originalLeft + dx}px`;
          break;
        case 'bottom-right':
          component.style.width = `${this.originalWidth + dx}px`;
          component.style.height = `${this.originalHeight + dy}px`;
          break;
      }
    }
  },
  
  handleResizeEnd() {
    if (this.resizingComponentIndex !== null) {
      this.recordSnapshot(); // 记录快照
    }
    this.resizingComponentIndex = null;
    this.resizingHandle = null;
    document.removeEventListener('mousemove', this.handleResizeMove);
    document.removeEventListener('mouseup', this.handleResizeEnd);
  },
  handleRotateStart(index, event) {
      this.rotatingComponentIndex = index;
      const component = this.canvasComponents[index];
      const rect = event.target.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      this.startX = event.clientX;
      this.startY = event.clientY;
      this.startAngle = Math.atan2(event.clientY - this.centerY, event.clientX - this.centerX) * (180 / Math.PI);
      this.initialRotation = component.rotation || 0;

      document.addEventListener('mousemove', this.handleRotateMove);
      document.addEventListener('mouseup', this.handleRotateEnd);
    },

    handleRotateMove(event) {
      if (this.rotatingComponentIndex !== null) {
        const dx = event.clientX - this.centerX;
        const dy = event.clientY - this.centerY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const component = this.canvasComponents[this.rotatingComponentIndex];
        component.rotation = this.initialRotation + angle - this.startAngle;
      }
    },

    handleRotateEnd() {
      if (this.rotatingComponentIndex !== null) {
        this.recordSnapshot(); // 记录快照
      }
      this.rotatingComponentIndex = null;
      document.removeEventListener('mousemove', this.handleRotateMove);
      document.removeEventListener('mouseup', this.handleRotateEnd);
    },




showContextMenu(event, index) {
  event.preventDefault(); // 阻止默认右键菜单

  // 计算菜单的位置
  const canvasRect = this.$refs.canvas.getBoundingClientRect();
  this.contextMenuStyle.top = `${event.clientY - canvasRect.top}px`;
  this.contextMenuStyle.left = `${event.clientX - canvasRect.left}px`;

  // 显示菜单
  this.contextMenuVisible = true;
  this.contextMenuTargetIndex = index;

  // 点击其他地方关闭菜单
  document.addEventListener('click', this.hideContextMenu);
},


  hideContextMenu() {
    this.contextMenuVisible = false;
    document.removeEventListener('click', this.hideContextMenu);
  },

  handleContextMenuAction(action) {
    const index = this.contextMenuTargetIndex;

    if (index !== -1) {
      switch (action) {
        case 'delete':
          this.canvasComponents.splice(index, 1);
          this.recordSnapshot(); // 记录快照
          break;
        case 'copy':
          const copiedComponent = deepCopy(this.canvasComponents[index]);
          copiedComponent.id = generateID();
          copiedComponent.style.left = parseInt(copiedComponent.style.left, 10) + 20 + 'px'; // 偏移位置以示区别
          copiedComponent.style.top = parseInt(copiedComponent.style.top, 10) + 20 + 'px';
          this.copiedComponent = copiedComponent; // 记录复制的组件
          break;
        case 'paste':
          if (this.copiedComponent) {
            const newComponent = deepCopy(this.copiedComponent);
            newComponent.id = generateID();
            newComponent.style.left = parseInt(newComponent.style.left, 10) + 20 + 'px'; // 偏移位置以示区别
            newComponent.style.top = parseInt(newComponent.style.top, 10) + 20 + 'px';
            this.canvasComponents.push(newComponent);
            this.recordSnapshot(); // 记录快照
          }
          break;
        case 'cut':
          const cutComponent = deepCopy(this.canvasComponents[index]);
          cutComponent.id = generateID();
          cutComponent.style.left = parseInt(cutComponent.style.left, 10) + 20 + 'px'; // 偏移位置以示区别
          cutComponent.style.top = parseInt(cutComponent.style.top, 10) + 20 + 'px';
          this.cutComponent = cutComponent; // 记录剪切的组件
          this.canvasComponents.splice(index, 1); // 删除原组件
          this.recordSnapshot(); // 记录快照
          break;
        // 其他操作...
      }
    }

    this.contextMenuVisible = false;
    this.contextMenuTargetIndex = -1;
  },
        updateCanvasSize() {
    // 更新画布大小
    const newWidth = parseInt(this.canvasWidth);
    const newHeight = parseInt(this.canvasHeight);

    if (isNaN(newWidth) || isNaN(newHeight) || newWidth <= 0 || newHeight <= 0) {
      this.$message.error('请输入有效的宽度和高度');
      return;
    }

    // 更新画布尺寸
    const canvas = this.$refs.canvas;
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;

    // 更新画布中组件的位置，保持在画布内部
    this.canvasComponents.forEach(component => {
      const left = parseInt(component.style.left, 10);
      const top = parseInt(component.style.top, 10);

      if (!isNaN(left) && !isNaN(top)) {
        // 计算新的左上角坐标
        const newLeft = Math.min(left, newWidth - component.style.width);
        const newTop = Math.min(top, newHeight - component.style.height);

        // 更新组件位置
        component.style.left = `${newLeft}px`;
        component.style.top = `${newTop}px`;
      }
    });

    this.$message.success('画布大小已更新');
  },
        togglePreviewMode() {
    this.previewMode = !this.previewMode;
  },
        saveToLocalStorage() {
    localStorage.setItem('canvasComponents', JSON.stringify(this.canvasComponents));
  },
        clearCanvas() {
            this.canvasComponents = []; // 清空画布组件数组
  localStorage.removeItem('canvasComponents'); // 清除本地存储的数据
  this.recordSnapshot(); // 记录快照
  },
      recordSnapshot() {
        // 清除当前快照之后的快照
        if (this.snapshotIndex < this.snapshotData.length - 1) {
          this.snapshotData = this.snapshotData.slice(0, this.snapshotIndex + 1);
        }
        // 记录当前 canvasComponents 的快照
        this.snapshotData.push(deepCopy(this.canvasComponents));
        this.snapshotIndex = this.snapshotData.length - 1;
      },
      undo() {
        if (this.snapshotIndex > 0) {
          this.snapshotIndex--;
          this.canvasComponents = deepCopy(this.snapshotData[this.snapshotIndex]);
        }
      },
      showJsonModal() {
        this.jsonContent = JSON.stringify(this.canvasComponents, null, 2);
        this.isJsonModalVisible = true;
      },
      handleSaveJson(updatedJson) {
        try {
          const updatedComponents = JSON.parse(updatedJson);
          this.canvasComponents = updatedComponents;
          this.recordSnapshot(); // 记录快照
        } catch (error) {
          console.error("Invalid JSON:", error);
        }
        this.isJsonModalVisible = false;
      },
      handleDragStart(index) {
        event.dataTransfer.setData("index", index);
        this.isDraggingFromCanvas = false; // 拖动开始时初始化标志变量
      },
      handleCanvasDragStart(index) {
        event.dataTransfer.setData("index", index);
        this.isDraggingFromCanvas = true; // 拖动开始时初始化标志变量
      },
      handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
  
        const index = event.dataTransfer.getData("index");
        const canvasRect = this.$refs.canvas.getBoundingClientRect();
  
        if (!this.isDraggingFromCanvas && index) { // 仅在从左侧组件列表拖动时添加组件
          const originalComponent = this.componentList[index];
          const newComponent = deepCopy(originalComponent);
          newComponent.id = generateID();
          newComponent.style.left = `${event.clientX - canvasRect.left}px`;
          newComponent.style.top = `${event.clientY - canvasRect.top}px`;
          this.canvasComponents.push(newComponent);
          this.recordSnapshot(); // 记录快照
        } else if (this.isDraggingFromCanvas && this.draggingComponentIndex !== null) {
          // 更新组件位置
          const component = this.canvasComponents[this.draggingComponentIndex];
          component.style.left = `${event.clientX - canvasRect.left - this.startX}px`;
          component.style.top = `${event.clientY - canvasRect.top - this.startY}px`;
          this.draggingComponentIndex = null;
          this.recordSnapshot(); // 记录快照
        }
      },
      handleDragOver(event) {
        event.preventDefault();
      },
      handleMouseDown(index, event) {
        const component = this.canvasComponents[index];
        const rect = event.target.getBoundingClientRect();
        this.startX = event.clientX - rect.left;
        this.startY = event.clientY - rect.top;
        this.initialLeft = parseInt(component.style.left, 10);
        this.initialTop = parseInt(component.style.top, 10);
        this.draggingComponentIndex = index;
  
        document.addEventListener("mousemove", this.handleMouseMove);
        document.addEventListener("mouseup", this.handleMouseUp);
      },
      handleMouseMove(event) {
        if (this.draggingComponentIndex !== null) {
          const component = this.canvasComponents[this.draggingComponentIndex];
          const canvasRect = this.$refs.canvas.getBoundingClientRect();
          component.style.left = `${event.clientX - canvasRect.left - this.startX}px`;
          component.style.top = `${event.clientY - canvasRect.top - this.startY}px`;
        }
      },
      handleMouseUp() {
        if (this.draggingComponentIndex !== null) {
          this.recordSnapshot(); // 记录快照
        }
        this.draggingComponentIndex = null;
        document.removeEventListener("mousemove", this.handleMouseMove);
        document.removeEventListener("mouseup", this.handleMouseUp);
      },
      onImportJSON() {
        this.jsonData = '';
        this.isExport = false;
        this.isShowDialog = true;
      },
      processJSON() {
        try {
          const data = JSON.parse(this.jsonData);
          if (!Array.isArray(data)) {
            this.$message.error('数据格式错误，组件数据必须是一个数组');
            return;
          }
  
          if (this.isExport) {
            this.downloadFileUtil(this.jsonData, 'application/json', 'data.json');
          } else {
            this.canvasComponents = data;
            this.recordSnapshot(); // 记录快照
          }
  
          this.isShowDialog = false;
        } catch (error) {
          this.$message.error('数据格式错误，请传入合法的 JSON 格式数据');
        }
      },
      onExportJSON() {
        this.isShowDialog = true;
        this.isExport = true;
        this.jsonData = JSON.stringify(this.canvasComponents, null, 4);
      },
      downloadFileUtil(data, type, fileName = '') {
        const url = window.URL.createObjectURL(new Blob([data], { type }));
        const link = document.createElement('a');
  
        link.style.display = 'none';
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
  
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      beforeUpload(e) {
        // 通过json文件导入
        const reader = new FileReader();
        reader.readAsText(e);
        const self = this;
        reader.onload = function () {
          self.jsonData = this.result;
          console.log(this.result);
        };
  
        return false;
      }
    },
    created(){
        // 加载本地存储的画布组件数据
        const savedComponents = localStorage.getItem('canvasComponents');
        if (savedComponents) {
            this.canvasComponents = JSON.parse(savedComponents);
        }
    }
  };
  </script>
  
  <style scoped>
  .app {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
  }
  
  .toolbar {
    display: flex;
    justify-content: flex-start;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .component-list {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .canvas {
  width: 100%;
  height: 400px;
  border: 1px solid #ccc;
  position: relative;
  background-image:
    linear-gradient(0deg, transparent 1px, #ccc 1px),
    linear-gradient(90deg, transparent 1px, #ccc 1px);
  background-size: 20px 20px, 20px 20px;
  background-position: -1px -1px, -1px -1px;
  background-color: white; /* Ensure a white background color */
}
  
  .draggable {
    display: inline-block;
    padding: 5px;
    background-color: #fff;
    border: 1px solid #ccc;
    cursor: grab;
  }
  
  .rectangle {
    width: 100px;
    height: 100px;
    background-color: #f0f0f0;
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
  
    & > * {
      margin-left: 10px;
    }
  }
  .no-events {
  pointer-events: none; /* 在预览模式下禁用所有鼠标事件 */
}
.context-menu {
  position: absolute;
  z-index: 1000; /* 确保菜单显示在其他元素上层 */
  /* 其他样式设置 */
}

.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: #000;
  cursor: pointer;
}

.top-left {
  top: -5px;
  left: -5px;
  cursor: nwse-resize;
}

.top-right {
  top: -5px;
  right: -5px;
  cursor: nesw-resize;
}

.bottom-left {
  bottom: -5px;
  left: -5px;
  cursor: nesw-resize;
}

.bottom-right {
  bottom: -5px;
  right: -5px;
  cursor: nwse-resize;
}

.rotate-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: red;
  cursor: grab;
  right: -5px;
  bottom: -5px;
}

  </style>
  