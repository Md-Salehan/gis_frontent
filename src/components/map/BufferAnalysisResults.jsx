import React, { memo } from "react";
import { Card, Tag, Collapse, Typography, Alert, Progress, Spin, Space } from "antd";
import {
  CheckCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
const { Panel } = Collapse;

const BufferAnalysisResults = memo(({ 
  analysisState, 
  geoJsonLayers,
  selectedLayerIds,
  onClear 
}) => {
  const {
    status, // 'idle' | 'analyzing' | 'complete' | 'error'
    progress,
    processedCount,
    totalCount,
    matchedFeatures,
    error,
    results,
  } = analysisState;

  if (status === 'idle') {
    return null;
  }

  if (status === 'error') {
    return (
      <Alert
        type="error"
        message="Analysis Error"
        description={error || "An error occurred during analysis"}
        showIcon
        closable
        onClose={onClear}
        style={{ marginTop: 12 }}
      />
    );
  }

  if (status === 'analyzing') {
    return (
      <div style={{ padding: '16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
          <Text>Analyzing features...</Text>
        </div>
        <Progress 
          percent={progress} 
          status="active"
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
        />
        <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Text type="secondary">Processed: {processedCount}</Text>
          <Text type="secondary">Total: {totalCount}</Text>
          <Text type="secondary">Found: {matchedFeatures.length}</Text>
        </div>
      </div>
    );
  }

  if (status === 'complete') {
    const totalMatched = matchedFeatures.length;
    const totalLayers = selectedLayerIds.length;
    
    return (
      <Card size="small" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
          <Text strong>Analysis Complete</Text>
        </div>
        <Space wrap size={[8, 8]} style={{ marginBottom: 8 }}>
          <Tag color="green">{totalMatched} matching features</Tag>
          <Tag color="blue">{totalLayers} layers analyzed</Tag>
          <Tag color="purple">{totalCount} total features processed</Tag>
        </Space>
        
        {selectedLayerIds.length > 0 && (
          <Collapse 
            size="small" 
            style={{ marginTop: 8 }}
            defaultActiveKey={['results']}
          >
            <Panel 
              header={`Results by Layer (${selectedLayerIds.length})`} 
              key="results"
            >
              {selectedLayerIds.map((layerId) => {
                const layerName = geoJsonLayers[layerId]?.metaData?.layer?.layer_nm || layerId;
                const matchedInLayer = matchedFeatures.filter(m => m.layerId === layerId).length;
                const totalInLayer = geoJsonLayers[layerId]?.geoJsonData?.features?.length || 0;
                
                return (
                  <div key={layerId} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '4px 0',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <Text>{layerName}</Text>
                    <div>
                      <Tag color={matchedInLayer > 0 ? 'green' : 'default'}>
                        {matchedInLayer} / {totalInLayer} features
                      </Tag>
                    </div>
                  </div>
                );
              })}
            </Panel>
          </Collapse>
        )}
      </Card>
    );
  }

  return null;
});

BufferAnalysisResults.displayName = "BufferAnalysisResults";
export default BufferAnalysisResults;