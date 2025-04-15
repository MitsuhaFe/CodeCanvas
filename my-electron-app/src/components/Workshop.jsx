import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Row, Col, Typography, Modal, Form, Upload, message, Tag, Space, Tabs } from 'antd';
import { SearchOutlined, UploadOutlined, HeartOutlined, HeartFilled, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import '../styles/Workshop.css';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

/**
 * 创意工坊组件
 */
const Workshop = () => {
  // 状态管理
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadForm] = Form.useForm();
  const [previewImage, setPreviewImage] = useState(null);
  const [contentFile, setContentFile] = useState(null);
  const [currentTab, setCurrentTab] = useState('1');

  // 初始化加载数据
  useEffect(() => {
    fetchProjects();
  }, []);

  // 根据类型和搜索关键词筛选项目
  useEffect(() => {
    if (selectedType === 'all' && !searchKeyword) {
      fetchProjects();
    } else if (selectedType !== 'all' && !searchKeyword) {
      fetchProjectsByType(selectedType);
    } else {
      searchProjects(searchKeyword);
    }
  }, [selectedType, searchKeyword]);

  // 获取所有项目
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8080/api/workshop');
      setProjects(response.data);
    } catch (error) {
      console.error('获取项目失败:', error);
      message.error('获取项目失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 根据类型获取项目
  const fetchProjectsByType = async (type) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8080/api/workshop/type/${type}`);
      setProjects(response.data);
    } catch (error) {
      console.error('获取项目失败:', error);
      message.error('获取项目失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 搜索项目
  const searchProjects = async (keyword) => {
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8080/api/workshop/search?keyword=${keyword}`);
      setProjects(response.data);
    } catch (error) {
      console.error('搜索项目失败:', error);
      message.error('搜索项目失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 下载项目
  const downloadProject = async (id) => {
    try {
      // 先更新下载计数
      await axios.post(`http://localhost:8080/api/workshop/download/${id}`);
      
      // 下载文件
      const response = await axios({
        url: `http://localhost:8080/api/workshop/content/${id}`,
        method: 'GET',
        responseType: 'blob',
      });

      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // 从响应头中获取文件名
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'download.zip';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 获取最新的项目数据并更新状态
      fetchProjects();
    } catch (error) {
      console.error('下载失败:', error);
      message.error('下载失败，请稍后重试');
    }
  };

  // 点赞项目
  const likeProject = async (id) => {
    try {
      const response = await axios.post(`http://localhost:8080/api/workshop/like/${id}`);
      // 更新点赞计数
      setProjects(projects.map(project => 
        project.id === id ? { ...project, likes: response.data.likes } : project
      ));
      message.success('点赞成功');
    } catch (error) {
      console.error('点赞失败:', error);
      message.error('点赞失败，请稍后重试');
    }
  };

  // 上传项目
  const uploadProject = async (values) => {
    if (!previewImage || !contentFile) {
      message.error('请上传预览图片和内容文件');
      return;
    }

    // 创建表单数据
    const formData = new FormData();
    
    // 添加所有项目信息
    formData.append('name', values.name);
    formData.append('description', values.description);
    formData.append('author', values.author);
    formData.append('type', values.type);
    
    // 处理标签
    const tags = values.tags.split(',').map(tag => tag.trim());
    tags.forEach(tag => {
      formData.append('tags', tag);
    });
    
    formData.append('previewImage', previewImage);
    formData.append('contentFile', contentFile);

    setLoading(true);
    try {
      await axios.post('http://localhost:8080/api/workshop', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      message.success('上传成功');
      setUploadModalVisible(false);
      uploadForm.resetFields();
      setPreviewImage(null);
      setContentFile(null);
      
      // 刷新项目列表
      fetchProjects();
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理预览图片上传
  const handlePreviewImageUpload = (file) => {
    setPreviewImage(file);
    return false; // 阻止自动上传
  };

  // 处理内容文件上传
  const handleContentFileUpload = (file) => {
    setContentFile(file);
    return false; // 阻止自动上传
  };

  // 切换tab
  const handleTabChange = (key) => {
    setCurrentTab(key);
  };

  // 渲染项目卡片
  const renderProjectCard = (project) => (
    <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
      <Card
        hoverable
        cover={<img alt={project.name} src={`http://localhost:8080${project.previewImageUrl}`} />}
        className="project-card"
        actions={[
          <Button 
            icon={<DownloadOutlined />} 
            onClick={() => downloadProject(project.id)}
          >
            {project.downloads}
          </Button>,
          <Button 
            icon={project.liked ? <HeartFilled /> : <HeartOutlined />} 
            onClick={() => likeProject(project.id)}
          >
            {project.likes}
          </Button>,
        ]}
      >
        <Card.Meta 
          title={project.name} 
          description={
            <>
              <Paragraph ellipsis={{ rows: 2 }}>{project.description}</Paragraph>
              <Space>
                <Tag color="blue">{project.type}</Tag>
                {project.tags && project.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
              <div className="project-author">作者: {project.author}</div>
            </>
          } 
        />
      </Card>
    </Col>
  );

  // 上传模态框
  const uploadModal = (
    <Modal
      title="上传项目"
      visible={uploadModalVisible}
      onCancel={() => setUploadModalVisible(false)}
      footer={null}
      destroyOnClose
    >
      <Form
        form={uploadForm}
        layout="vertical"
        onFinish={uploadProject}
      >
        <Form.Item
          name="name"
          label="项目名称"
          rules={[{ required: true, message: '请输入项目名称' }]}
        >
          <Input placeholder="请输入项目名称" />
        </Form.Item>
        
        <Form.Item
          name="description"
          label="项目描述"
          rules={[{ required: true, message: '请输入项目描述' }]}
        >
          <Input.TextArea rows={4} placeholder="请输入项目描述" />
        </Form.Item>
        
        <Form.Item
          name="author"
          label="作者"
          rules={[{ required: true, message: '请输入作者名称' }]}
        >
          <Input placeholder="请输入作者名称" />
        </Form.Item>
        
        <Form.Item
          name="type"
          label="项目类型"
          rules={[{ required: true, message: '请选择项目类型' }]}
        >
          <Select placeholder="请选择项目类型">
            <Option value="wallpaper">壁纸</Option>
            <Option value="widget">小组件</Option>
            <Option value="dock">Dock</Option>
            <Option value="pet">桌宠</Option>
          </Select>
        </Form.Item>
        
        <Form.Item
          name="tags"
          label="标签"
          rules={[{ required: true, message: '请输入标签，用逗号分隔' }]}
        >
          <Input placeholder="请输入标签，用逗号分隔" />
        </Form.Item>
        
        <Form.Item
          name="previewImage"
          label="预览图片"
          rules={[{ required: true, message: '请上传预览图片' }]}
        >
          <Upload
            listType="picture"
            beforeUpload={handlePreviewImageUpload}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>上传预览图片</Button>
          </Upload>
        </Form.Item>
        
        <Form.Item
          name="contentFile"
          label="内容文件"
          rules={[{ required: true, message: '请上传内容文件' }]}
        >
          <Upload
            beforeUpload={handleContentFileUpload}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>上传内容文件 (zip格式)</Button>
          </Upload>
        </Form.Item>
        
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            上传
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );

  return (
    <div className="workshop-container">
      <div className="workshop-header">
        <Title level={2}>创意工坊</Title>
        <div className="workshop-actions">
          <Input
            placeholder="搜索项目"
            prefix={<SearchOutlined />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            style={{ width: 200, marginRight: 16 }}
          />
          <Select
            defaultValue="all"
            style={{ width: 120, marginRight: 16 }}
            onChange={setSelectedType}
          >
            <Option value="all">全部</Option>
            <Option value="wallpaper">壁纸</Option>
            <Option value="widget">小组件</Option>
            <Option value="dock">Dock</Option>
            <Option value="pet">桌宠</Option>
          </Select>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传项目
          </Button>
        </div>
      </div>

      <Tabs activeKey={currentTab} onChange={handleTabChange}>
        <TabPane tab="全部项目" key="1">
          <Row gutter={[16, 16]}>
            {loading ? (
              <div>加载中...</div>
            ) : projects.length > 0 ? (
              projects.map(project => renderProjectCard(project))
            ) : (
              <div className="no-data">暂无数据</div>
            )}
          </Row>
        </TabPane>
        <TabPane tab="我的上传" key="2">
          <div className="coming-soon">
            <Title level={3}>即将推出</Title>
            <Paragraph>此功能正在开发中，敬请期待</Paragraph>
          </div>
        </TabPane>
        <TabPane tab="我的收藏" key="3">
          <div className="coming-soon">
            <Title level={3}>即将推出</Title>
            <Paragraph>此功能正在开发中，敬请期待</Paragraph>
          </div>
        </TabPane>
      </Tabs>

      {uploadModal}
    </div>
  );
};

export default Workshop; 