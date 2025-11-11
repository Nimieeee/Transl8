#!/usr/bin/env python3
"""
Cost Tracking Exporter for Kubernetes GPU Infrastructure
Calculates and exports cost metrics based on GPU usage and instance types
"""

import os
import json
import time
import logging
from typing import Dict, List
from datetime import datetime, timedelta
import requests
from prometheus_client import start_http_server, Gauge, Counter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
gpu_cost_per_hour = Gauge(
    'gpu_cost_per_hour',
    'Cost per hour for GPU instances',
    ['node', 'instance_type', 'gpu_type']
)

service_cost_per_hour = Gauge(
    'service_cost_per_hour',
    'Estimated cost per hour by service',
    ['service', 'namespace']
)

service_cost_per_minute = Gauge(
    'service_cost_per_minute',
    'Estimated cost per processing minute by service',
    ['service', 'namespace']
)

monthly_cost_projection = Gauge(
    'monthly_cost_projection',
    'Projected monthly cost by service',
    ['service', 'namespace']
)

budget_utilization = Gauge(
    'budget_utilization_percentage',
    'Budget utilization percentage by service',
    ['service', 'namespace']
)

cost_per_job = Gauge(
    'cost_per_job',
    'Estimated cost per job by service',
    ['service', 'queue_name']
)

total_gpu_hours = Counter(
    'total_gpu_hours',
    'Total GPU hours consumed',
    ['service', 'gpu_type']
)


class CostTrackingExporter:
    """Exports cost tracking metrics for GPU infrastructure"""
    
    def __init__(
        self,
        cloud_provider: str,
        prometheus_url: str,
        update_interval: int = 300
    ):
        self.cloud_provider = cloud_provider
        self.prometheus_url = prometheus_url
        self.update_interval = update_interval
        
        # Load cost configuration
        self.gpu_costs = self.load_gpu_costs()
        self.cost_allocation = self.load_cost_allocation()
        
        logger.info(f"Initialized cost tracking for {cloud_provider}")
        logger.info(f"Prometheus URL: {prometheus_url}")
    
    def load_gpu_costs(self) -> Dict:
        """Load GPU instance costs from config"""
        try:
            with open('/config/gpu_costs.json', 'r') as f:
                costs = json.load(f)
                return costs.get(self.cloud_provider, {})
        except Exception as e:
            logger.error(f"Error loading GPU costs: {e}")
            return {}
    
    def load_cost_allocation(self) -> Dict:
        """Load cost allocation budgets from config"""
        try:
            with open('/config/cost_allocation.json', 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading cost allocation: {e}")
            return {}
    
    def query_prometheus(self, query: str) -> List[Dict]:
        """Query Prometheus and return results"""
        try:
            response = requests.get(
                f"{self.prometheus_url}/api/v1/query",
                params={'query': query},
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            if data['status'] == 'success':
                return data['data']['result']
            else:
                logger.error(f"Prometheus query failed: {data}")
                return []
        except Exception as e:
            logger.error(f"Error querying Prometheus: {e}")
            return []
    
    def get_node_costs(self) -> Dict[str, float]:
        """Get cost per hour for each node"""
        node_costs = {}
        
        # Query for node instance types
        query = 'kube_node_labels{label_node_kubernetes_io_instance_type=~".*"}'
        results = self.query_prometheus(query)
        
        for result in results:
            node = result['metric'].get('node', '')
            instance_type = result['metric'].get('label_node_kubernetes_io_instance_type', '')
            
            # Get cost from config
            cost = self.gpu_costs.get(instance_type, 0)
            node_costs[node] = cost
            
            # Determine GPU type
            gpu_type = 'unknown'
            if 'a100' in instance_type.lower() or 'a2-' in instance_type.lower():
                gpu_type = 'a100'
            elif 'v100' in instance_type.lower() or 'p3' in instance_type.lower():
                gpu_type = 'v100'
            
            # Update metric
            gpu_cost_per_hour.labels(
                node=node,
                instance_type=instance_type,
                gpu_type=gpu_type
            ).set(cost)
        
        return node_costs
    
    def calculate_service_costs(self, node_costs: Dict[str, float]):
        """Calculate cost per service"""
        # Query for pods by service
        query = 'kube_pod_info{namespace="ai-models"}'
        results = self.query_prometheus(query)
        
        service_costs = {}
        
        for result in results:
            service = result['metric'].get('pod', '').split('-')[0]
            node = result['metric'].get('node', '')
            
            if node in node_costs:
                cost = node_costs[node]
                
                if service not in service_costs:
                    service_costs[service] = 0
                service_costs[service] += cost
        
        # Update metrics
        for service, cost in service_costs.items():
            service_cost_per_hour.labels(
                service=service,
                namespace='ai-models'
            ).set(cost)
            
            service_cost_per_minute.labels(
                service=service,
                namespace='ai-models'
            ).set(cost / 60)
            
            # Monthly projection (24 hours * 30 days)
            monthly = cost * 24 * 30
            monthly_cost_projection.labels(
                service=service,
                namespace='ai-models'
            ).set(monthly)
            
            # Budget utilization
            if service in self.cost_allocation:
                budget = self.cost_allocation[service]['budget_monthly']
                utilization = (monthly / budget) * 100
                budget_utilization.labels(
                    service=service,
                    namespace='ai-models'
                ).set(utilization)
    
    def calculate_cost_per_job(self):
        """Calculate cost per job by service"""
        # Query for job completion rate
        query = 'rate(job_completed_total[1h]) * 3600'
        results = self.query_prometheus(query)
        
        jobs_per_hour = {}
        for result in results:
            service = result['metric'].get('app', '')
            queue = result['metric'].get('queue_name', '')
            rate = float(result['value'][1])
            jobs_per_hour[f"{service}:{queue}"] = rate
        
        # Query for service costs
        query = 'service_cost_per_hour'
        results = self.query_prometheus(query)
        
        for result in results:
            service = result['metric'].get('service', '')
            cost_hour = float(result['value'][1])
            
            # Find matching queue
            for key, jobs in jobs_per_hour.items():
                if service in key:
                    queue = key.split(':')[1]
                    if jobs > 0:
                        cost = cost_hour / jobs
                        cost_per_job.labels(
                            service=service,
                            queue_name=queue
                        ).set(cost)
    
    def track_gpu_hours(self):
        """Track cumulative GPU hours"""
        # Query for GPU utilization over time
        query = 'sum by (app) (DCGM_FI_DEV_GPU_UTIL{kubernetes_namespace="ai-models"} > 0)'
        results = self.query_prometheus(query)
        
        for result in results:
            service = result['metric'].get('app', '')
            # Each scrape represents usage, convert to hours
            hours = self.update_interval / 3600
            
            # Determine GPU type from service
            gpu_type = 'v100'  # Default
            if 'a100' in service.lower():
                gpu_type = 'a100'
            
            total_gpu_hours.labels(
                service=service,
                gpu_type=gpu_type
            ).inc(hours)
    
    def update_metrics(self):
        """Update all cost metrics"""
        try:
            logger.info("Updating cost metrics...")
            
            # Get node costs
            node_costs = self.get_node_costs()
            logger.info(f"Found {len(node_costs)} nodes with costs")
            
            # Calculate service costs
            self.calculate_service_costs(node_costs)
            
            # Calculate cost per job
            self.calculate_cost_per_job()
            
            # Track GPU hours
            self.track_gpu_hours()
            
            logger.info("Cost metrics updated successfully")
        except Exception as e:
            logger.error(f"Error updating metrics: {e}")
    
    def run(self):
        """Main loop to continuously update metrics"""
        logger.info(f"Starting cost tracking exporter (interval: {self.update_interval}s)")
        
        while True:
            try:
                self.update_metrics()
                time.sleep(self.update_interval)
            except KeyboardInterrupt:
                logger.info("Shutting down cost tracking exporter")
                break
            except Exception as e:
                logger.error(f"Error in metrics loop: {e}")
                time.sleep(self.update_interval)


def main():
    """Main entry point"""
    # Get configuration from environment
    cloud_provider = os.getenv('CLOUD_PROVIDER', 'gke')
    prometheus_url = os.getenv('PROMETHEUS_URL', 'http://prometheus:9090')
    update_interval = int(os.getenv('UPDATE_INTERVAL', '300'))
    metrics_port = int(os.getenv('METRICS_PORT', '9091'))
    
    # Start Prometheus HTTP server
    start_http_server(metrics_port)
    logger.info(f"Metrics server started on port {metrics_port}")
    
    # Create and run exporter
    exporter = CostTrackingExporter(
        cloud_provider=cloud_provider,
        prometheus_url=prometheus_url,
        update_interval=update_interval
    )
    
    exporter.run()


if __name__ == '__main__':
    main()
