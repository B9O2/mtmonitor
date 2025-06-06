package web

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func (mws *MonitorWebServer) SetRoutes() {
	// 首页重定向到UI
	mws.render.GET("/", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/ui")
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
					"interval": core.Interval.String(),
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
				"interval": core.Interval.String(),
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

			interval, err := time.ParseDuration(req.Interval)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "无效的时间间隔格式"})
				return
			}

			err = mws.AddCore(req.Name, req.Host, req.Port, interval, req.CredName)
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
