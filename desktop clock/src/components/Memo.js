import React, { useState, useEffect } from 'react';
import { Button, Input, List, Tag, Modal, Select, message, Space, Tooltip } from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined, 
  PushpinOutlined,
  SearchOutlined,
  FileTextOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import './Memo.css';

const { TextArea } = Input;
const { Option } = Select;

const Memo = () => {
  const [memos, setMemos] = useState([]);
  const [filteredMemos, setFilteredMemos] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingMemo, setEditingMemo] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'personal',
    pinned: false
  });

  const categories = {
    personal: { label: '个人', color: 'blue' },
    work: { label: '工作', color: 'green' },
    study: { label: '学习', color: 'orange' },
    life: { label: '生活', color: 'purple' },
    other: { label: '其他', color: 'default' }
  };

  useEffect(() => {
    const savedMemos = localStorage.getItem('memos');
    if (savedMemos) {
      setMemos(JSON.parse(savedMemos));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('memos', JSON.stringify(memos));
  }, [memos]);

  useEffect(() => {
    filterMemos();
  }, [memos, searchText, selectedCategory]);

  const filterMemos = () => {
    let filtered = [...memos];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(memo => memo.category === selectedCategory);
    }

    if (searchText) {
      filtered = filtered.filter(memo => 
        memo.title.toLowerCase().includes(searchText.toLowerCase()) ||
        memo.content.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    setFilteredMemos(filtered);
  };

  const showModal = (memo = null) => {
    if (memo) {
      setEditingMemo(memo);
      setFormData({
        title: memo.title,
        content: memo.content,
        category: memo.category,
        pinned: memo.pinned
      });
    } else {
      setEditingMemo(null);
      setFormData({
        title: '',
        content: '',
        category: 'personal',
        pinned: false
      });
    }
    setIsModalVisible(true);
  };

  const handleOk = () => {
    if (!formData.title || !formData.content) {
      message.error('请填写标题和内容');
      return;
    }

    const newMemo = {
      id: editingMemo ? editingMemo.id : Date.now(),
      title: formData.title,
      content: formData.content,
      category: formData.category,
      pinned: formData.pinned,
      createdAt: editingMemo ? editingMemo.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingMemo) {
      setMemos(prev => prev.map(m => m.id === editingMemo.id ? newMemo : m));
      message.success('备忘录已更新');
    } else {
      setMemos(prev => [...prev, newMemo]);
      message.success('备忘录已添加');
    }

    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const deleteMemo = (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条备忘录吗？',
      onOk: () => {
        setMemos(prev => prev.filter(m => m.id !== id));
        message.success('备忘录已删除');
      }
    });
  };

  const togglePin = (id) => {
    setMemos(prev => prev.map(m => 
      m.id === id ? { ...m, pinned: !m.pinned } : m
    ));
  };

  return (
    <div className="memo-container">
      <div className="memo-header">
        <h3><FileTextOutlined /> 备忘录</h3>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()}
          size="small"
        >
          新建备忘
        </Button>
      </div>

      <div className="memo-toolbar">
        <Input
          placeholder="搜索备忘录..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 200 }}
          size="small"
        />
        <Select
          value={selectedCategory}
          onChange={setSelectedCategory}
          style={{ width: 100 }}
          size="small"
        >
          <Option value="all">全部</Option>
          {Object.entries(categories).map(([key, value]) => (
            <Option key={key} value={key}>{value.label}</Option>
          ))}
        </Select>
      </div>

      <List
        className="memo-list"
        dataSource={filteredMemos}
        renderItem={item => (
          <List.Item
            className={`memo-item ${item.pinned ? 'pinned' : ''}`}
            actions={[
              <Tooltip title={item.pinned ? "取消置顶" : "置顶"}>
                <Button
                  icon={<PushpinOutlined />}
                  onClick={() => togglePin(item.id)}
                  size="small"
                  type={item.pinned ? "primary" : "text"}
                />
              </Tooltip>,
              <Button 
                icon={<EditOutlined />} 
                onClick={() => showModal(item)}
                size="small"
                type="text"
              />,
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => deleteMemo(item.id)}
                size="small"
                type="text"
              />
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <span className="memo-title">{item.title}</span>
                  <Tag color={categories[item.category].color} size="small">
                    {categories[item.category].label}
                  </Tag>
                  {item.pinned && <Tag color="red" size="small">置顶</Tag>}
                </Space>
              }
              description={
                <div>
                  <div className="memo-content">{item.content}</div>
                  <div className="memo-time">
                    {dayjs(item.updatedAt).format('MM-DD HH:mm')}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />

      <Modal
        title={editingMemo ? "编辑备忘录" : "新建备忘录"}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={500}
      >
        <div className="memo-form">
          <div className="form-item">
            <label>标题</label>
            <Input 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="输入备忘录标题"
            />
          </div>
          <div className="form-item">
            <label>内容</label>
            <TextArea 
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="输入备忘录内容"
              rows={6}
            />
          </div>
          <div className="form-item">
            <label>分类</label>
            <Select 
              value={formData.category}
              onChange={(value) => setFormData({...formData, category: value})}
              style={{ width: '100%' }}
            >
              {Object.entries(categories).map(([key, value]) => (
                <Option key={key} value={key}>
                  <Tag color={value.color}>{value.label}</Tag>
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Memo;