import React, { useState, useEffect } from 'react';
import { Switch, Slider, Button, Select, ColorPicker, message, Space, Divider } from 'antd';
import { 
  SettingOutlined, 
  SaveOutlined,
  ReloadOutlined,
  BgColorsOutlined,
  FontSizeOutlined,
  LockOutlined,
  SoundOutlined
} from '@ant-design/icons';
import './Settings.css';

const { Option } = Select;
const { ipcRenderer } = window.require ? window.require('electron') : {};

const Settings = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState({
    format24: true,
    showDate: true,
    showWeek: true,
    opacity: 0.9,
    alwaysOnTop: true,
    lockPosition: false,
    theme: 'dark',
    fontSize: 'medium',
    soundEnabled: true,
    autoStart: false,
    backgroundColor: '#1a1a2e',
    textColor: '#ffffff'
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('clockSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setSettings(parsed);
      applySettings(parsed);
    }
  }, []);

  const applySettings = (newSettings) => {
    if (ipcRenderer) {
      ipcRenderer.send('set-opacity', newSettings.opacity);
      ipcRenderer.send('toggle-always-on-top', newSettings.alwaysOnTop);
    }

    document.documentElement.style.setProperty('--bg-color', newSettings.backgroundColor);
    document.documentElement.style.setProperty('--text-color', newSettings.textColor);
    
    const fontSizes = {
      small: '12px',
      medium: '14px',
      large: '16px'
    };
    document.documentElement.style.setProperty('--base-font-size', fontSizes[newSettings.fontSize]);

    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    applySettings(newSettings);
  };

  const saveSettings = () => {
    localStorage.setItem('clockSettings', JSON.stringify(settings));
    message.success('设置已保存');
  };

  const resetSettings = () => {
    const defaultSettings = {
      format24: true,
      showDate: true,
      showWeek: true,
      opacity: 0.9,
      alwaysOnTop: true,
      lockPosition: false,
      theme: 'dark',
      fontSize: 'medium',
      soundEnabled: true,
      autoStart: false,
      backgroundColor: '#1a1a2e',
      textColor: '#ffffff'
    };
    setSettings(defaultSettings);
    applySettings(defaultSettings);
    localStorage.setItem('clockSettings', JSON.stringify(defaultSettings));
    message.info('设置已重置');
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h3><SettingOutlined /> 设置</h3>
        <Space>
          <Button 
            icon={<SaveOutlined />} 
            onClick={saveSettings}
            size="small"
            type="primary"
          >
            保存
          </Button>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={resetSettings}
            size="small"
          >
            重置
          </Button>
        </Space>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h4>时钟显示</h4>
          <div className="setting-item">
            <span>24小时制</span>
            <Switch 
              checked={settings.format24}
              onChange={(checked) => handleSettingChange('format24', checked)}
            />
          </div>
          <div className="setting-item">
            <span>显示日期</span>
            <Switch 
              checked={settings.showDate}
              onChange={(checked) => handleSettingChange('showDate', checked)}
            />
          </div>
          <div className="setting-item">
            <span>显示星期</span>
            <Switch 
              checked={settings.showWeek}
              onChange={(checked) => handleSettingChange('showWeek', checked)}
            />
          </div>
        </div>

        <Divider />

        <div className="settings-section">
          <h4>窗口设置</h4>
          <div className="setting-item">
            <span>窗口透明度</span>
            <Slider 
              min={0.3}
              max={1}
              step={0.1}
              value={settings.opacity}
              onChange={(value) => handleSettingChange('opacity', value)}
              style={{ width: 120 }}
            />
          </div>
          <div className="setting-item">
            <span>窗口置顶</span>
            <Switch 
              checked={settings.alwaysOnTop}
              onChange={(checked) => handleSettingChange('alwaysOnTop', checked)}
            />
          </div>
          <div className="setting-item">
            <span>锁定位置</span>
            <Switch 
              checked={settings.lockPosition}
              onChange={(checked) => handleSettingChange('lockPosition', checked)}
            />
          </div>
        </div>

        <Divider />

        <div className="settings-section">
          <h4>外观设置</h4>
          <div className="setting-item">
            <span>主题</span>
            <Select 
              value={settings.theme}
              onChange={(value) => handleSettingChange('theme', value)}
              style={{ width: 100 }}
              size="small"
            >
              <Option value="dark">深色</Option>
              <Option value="light">浅色</Option>
              <Option value="auto">自动</Option>
            </Select>
          </div>
          <div className="setting-item">
            <span>字体大小</span>
            <Select 
              value={settings.fontSize}
              onChange={(value) => handleSettingChange('fontSize', value)}
              style={{ width: 100 }}
              size="small"
            >
              <Option value="small">小</Option>
              <Option value="medium">中</Option>
              <Option value="large">大</Option>
            </Select>
          </div>
        </div>

        <Divider />

        <div className="settings-section">
          <h4>系统设置</h4>
          <div className="setting-item">
            <span>提醒声音</span>
            <Switch 
              checked={settings.soundEnabled}
              onChange={(checked) => handleSettingChange('soundEnabled', checked)}
            />
          </div>
          <div className="setting-item">
            <span>开机自启动</span>
            <Switch 
              checked={settings.autoStart}
              onChange={(checked) => handleSettingChange('autoStart', checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;