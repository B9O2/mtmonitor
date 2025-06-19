package web

import (
	"fmt"
	"io"
	"io/fs"
	"net/http"

	"github.com/B9O2/mtmonitor/runtime"
	"github.com/gin-gonic/gin"
)

func (mws *MonitorWebServer) SetRoutes(subFS fs.FS) {
	fmt.Println("文件系统内容:")
	err := fs.WalkDir(subFS, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		fmt.Println("- 发现文件:", path)
		return nil
	})
	if err != nil {
		fmt.Println("遍历文件系统错误:", err)
	}

	// 检查是否为静态资源
	mws.render.GET("/assets/*filepath", func(c *gin.Context) {
		c.FileFromFS(c.Request.URL.Path, http.FS(subFS))
	})

	mws.render.GET("/", func(c *gin.Context) {

		// 其他所有路由返回index.html
		indexFile, err := subFS.Open("index.html")
		if err != nil {
			fmt.Println(err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "无法加载前端页面" + err.Error()})
			return
		}
		defer indexFile.Close()

		content, err := io.ReadAll(indexFile)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "读取前端页面失败"})
			return
		}

		c.Data(http.StatusOK, "text/html; charset=utf-8", content)
	})

	// WebSocket端点
	mws.render.GET("/ws", func(c *gin.Context) {
		mws.HandleWebSocket(c.Writer, c.Request)
	})

	mws.setApiRoutes()
}

func (mws *MonitorWebServer) setApiRoutes() {
	// Core相关API
	apiGroup := mws.render.Group("/api")
	{
		// 获取所有cores列表
		apiGroup.GET("/cores", func(c *gin.Context) {
			var coreList []map[string]interface{}

			mws.cores.Range(func(key, value interface{}) bool {
				name := key.(string)
				core := value.(*MTCore)
				coreList = append(coreList, map[string]interface{}{
					"name":     name,
					"host":     core.Host,
					"port":     core.Port,
					"interval": core.Interval,
				})
				return true
			})

			c.JSON(http.StatusOK, coreList)
		})

		// 获取特定core的详情
		apiGroup.GET("/cores/:name", func(c *gin.Context) {
			name := c.Param("name")
			value, ok := mws.cores.Load(name)
			if !ok {
				c.JSON(http.StatusNotFound, gin.H{"error": "Core not found"})
				return
			}

			core := value.(*MTCore)
			c.JSON(http.StatusOK, gin.H{
				"name":     name,
				"host":     core.Host,
				"port":     core.Port,
				"interval": core.Interval,
			})
		})

		// 添加新的core
		apiGroup.POST("/cores", func(c *gin.Context) {
			var req struct {
				Name     string `json:"name" binding:"required"`
				Host     string `json:"host" binding:"required"`
				Port     int    `json:"port" binding:"required"`
				Interval string `json:"interval" binding:"required"`
				CredName string `json:"credential_name"`
			}

			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			err := mws.AddCore(req.Name, runtime.CoreConfig{
				Host:       req.Host,
				Port:       req.Port,
				Interval:   req.Interval,
				Credential: req.CredName,
			})
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusCreated, gin.H{"message": "Core添加成功"})
		})

		// 删除现有的core
		apiGroup.DELETE("/cores/:name", func(c *gin.Context) {
			name := c.Param("name")
			err := mws.RemoveCore(name)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
				return
			}

			c.JSON(http.StatusOK, gin.H{"message": "Core删除成功"})
		})

		// 获取所有Credentials列表
		apiGroup.GET("/credentials", func(c *gin.Context) {
			var credList []string
			for _, cred := range mws.credentials {
				credList = append(credList, cred.Name)
			}

			c.JSON(http.StatusOK, credList)
		},
		)
	}
}
