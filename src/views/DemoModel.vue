<template>
    <div class="demo-model">
      <div class="header">
        <el-button class="btn" icon="el-icon-close" @click="closeModel">
          关闭
        </el-button>
      </div>
      <div class="ace-editor">
        <div ref="ace" class="editor" />
      </div>
      <div class="footer">
        <el-button type="primary" @click="resetCode">重置代码</el-button>
        <el-button type="success" @click="saveCode">保存提交</el-button>
      </div>
    </div>
  </template>
  
  <script>
  import ace from "ace-builds";
  import "ace-builds/src-noconflict/theme-one_dark";
  import "ace-builds/src-noconflict/ext-searchbox";
  import "ace-builds/src-noconflict/mode-json5";
  import "ace-builds/src-noconflict/ext-language_tools";
  
  export default {
    name: "DemoModel",
    props: {
      jsonContent: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        editor: null,
      };
    },
    mounted() {
      ace.config.set(
        "basePath",
        "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.14/"
      );
      this.editor = ace.edit(this.$refs.ace, {
        maxLines: 40,
        minLines: 40,
        fontSize: 14,
        theme: "ace/theme/one_dark",
        mode: "ace/mode/json5",
        tabSize: 4,
        readOnly: false,
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
      });
  
      this.setCode();
    },
    methods: {
      setCode() {
        this.editor.setValue(this.jsonContent, -1);
      },
      resetCode() {
        this.setCode();
      },
      saveCode() {
        const updatedContent = this.editor.getValue();
        this.$emit("save-json", updatedContent);
      },
      closeModel() {
        this.$emit("close");
      },
    },
  };
  </script>
  
  <style scoped>
  .demo-model {
    position: absolute;
    height: calc(100% - 80px);
    width: 550px;
    top: 63px;
    background-color: #fff;
    border: 1px solid #ddd;
    z-index: 100;
    padding: 10px;
  }
  
  .header,
  .footer {
    display: flex;
    justify-content: flex-end;
  }
  
  .ace-editor {
    height: calc(100% - 80px);
    overflow: auto;
  }
  
  .editor {
    margin: 10px 0;
  }
  </style>
  