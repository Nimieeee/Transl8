#!/usr/bin/env python3
"""
Queue Metrics Exporter for Kubernetes HPA
Exports Redis queue depth metrics for horizontal pod autoscaling
"""

import os
import time
import logging
from typing import Dict, List
from prometheus_client import start_http_server, Gauge
import redis

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
queue_depth_gauge = Gauge(
    'redis_queue_depth',
    'Number of jobs in Redis queue',
    ['queue_name', 'queue_type']
)

queue_waiting_gauge = Gauge(
    'redis_queue_waiting',
    'Number of waiting jobs in Redis queue',
    ['queue_name']
)

queue_active_gauge = Gauge(
    'redis_queue_active',
    'Number of active jobs in Redis queue',
    ['queue_name']
)

queue_delayed_gauge = Gauge(
    'redis_queue_delayed',
    'Number of delayed jobs in Redis queue',
    ['queue_name']
)

queue_failed_gauge = Gauge(
    'redis_queue_failed',
    'Number of failed jobs in Redis queue',
    ['queue_name']
)


class QueueMetricsExporter:
    """Exports BullMQ queue metrics to Prometheus"""
    
    def __init__(
        self,
        redis_host: str,
        redis_port: int,
        queue_names: List[str],
        metrics_interval: int = 30
    ):
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.queue_names = queue_names
        self.metrics_interval = metrics_interval
        
        # Connect to Redis
        self.redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            decode_responses=True
        )
        
        logger.info(f"Connected to Redis at {redis_host}:{redis_port}")
        logger.info(f"Monitoring queues: {', '.join(queue_names)}")
    
    def get_queue_counts(self, queue_name: str) -> Dict[str, int]:
        """Get job counts for a BullMQ queue"""
        try:
            # BullMQ uses sorted sets and lists for different job states
            waiting = self.redis_client.llen(f"bull:{queue_name}:wait")
            active = self.redis_client.llen(f"bull:{queue_name}:active")
            delayed = self.redis_client.zcard(f"bull:{queue_name}:delayed")
            failed = self.redis_client.zcard(f"bull:{queue_name}:failed")
            
            # Total depth is waiting + active + delayed
            total = waiting + active + delayed
            
            return {
                'total': total,
                'waiting': waiting,
                'active': active,
                'delayed': delayed,
                'failed': failed
            }
        except Exception as e:
            logger.error(f"Error getting counts for queue {queue_name}: {e}")
            return {
                'total': 0,
                'waiting': 0,
                'active': 0,
                'delayed': 0,
                'failed': 0
            }
    
    def update_metrics(self):
        """Update Prometheus metrics for all queues"""
        for queue_name in self.queue_names:
            counts = self.get_queue_counts(queue_name)
            
            # Update gauges
            queue_depth_gauge.labels(
                queue_name=queue_name,
                queue_type='total'
            ).set(counts['total'])
            
            queue_waiting_gauge.labels(
                queue_name=queue_name
            ).set(counts['waiting'])
            
            queue_active_gauge.labels(
                queue_name=queue_name
            ).set(counts['active'])
            
            queue_delayed_gauge.labels(
                queue_name=queue_name
            ).set(counts['delayed'])
            
            queue_failed_gauge.labels(
                queue_name=queue_name
            ).set(counts['failed'])
            
            logger.debug(
                f"Queue {queue_name}: "
                f"total={counts['total']}, "
                f"waiting={counts['waiting']}, "
                f"active={counts['active']}, "
                f"delayed={counts['delayed']}, "
                f"failed={counts['failed']}"
            )
    
    def run(self):
        """Main loop to continuously update metrics"""
        logger.info(f"Starting metrics exporter (interval: {self.metrics_interval}s)")
        
        while True:
            try:
                self.update_metrics()
                time.sleep(self.metrics_interval)
            except KeyboardInterrupt:
                logger.info("Shutting down metrics exporter")
                break
            except Exception as e:
                logger.error(f"Error in metrics loop: {e}")
                time.sleep(self.metrics_interval)


def main():
    """Main entry point"""
    # Get configuration from environment
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', '6379'))
    queue_names = os.getenv('QUEUE_NAMES', 'stt-queue,mt-queue,tts-queue,lipsync-queue').split(',')
    metrics_interval = int(os.getenv('METRICS_INTERVAL', '30').rstrip('s'))
    metrics_port = int(os.getenv('METRICS_PORT', '9090'))
    
    # Start Prometheus HTTP server
    start_http_server(metrics_port)
    logger.info(f"Metrics server started on port {metrics_port}")
    
    # Create and run exporter
    exporter = QueueMetricsExporter(
        redis_host=redis_host,
        redis_port=redis_port,
        queue_names=queue_names,
        metrics_interval=metrics_interval
    )
    
    exporter.run()


if __name__ == '__main__':
    main()
