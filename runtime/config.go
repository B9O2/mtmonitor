package runtime

import (
	"fmt"
	"os"

	"github.com/BurntSushi/toml"
)

// 凭证配置
type CredentialConfig struct {
	Path string `toml:"path"`
}

// 核心配置
type CoreConfig struct {
	Host       string `toml:"host"`
	Port       int    `toml:"port"`
	Interval   string `toml:"interval"`
	Credential string `toml:"credential"`
}

// 配置结构
type Config struct {
	Credentials map[string]CredentialConfig `toml:"credentials"`
	Cores       map[string]CoreConfig       `toml:"cores"`
}

var (
	// GlobalConfig 全局配置变量，可直接访问
	GlobalConfig *Config
)

// LoadConfig 从指定路径加载配置
func LoadConfig(configPath string) (*Config, error) {
	// 如果未指定配置路径，则使用默认路径
	if configPath == "" {
		configPath = "config.toml"
	}

	// 检查文件是否存在
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("配置文件不存在: %s", configPath)
	}

	var config Config
	if _, err := toml.DecodeFile(configPath, &config); err != nil {
		return nil, fmt.Errorf("解析配置文件失败: %w", err)
	}

	return &config, nil
}

// InitConfig 初始化全局配置
func InitConfig(configPath string) error {
	var err error
	GlobalConfig, err = LoadConfig(configPath)
	return err
}
