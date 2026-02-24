#!/usr/bin/env python3
"""
API Monitor Python SDK Example

Install: pip install requests
Usage: python examples/python-sdk.py
"""

import requests
from typing import Dict, List, Optional

API_URL = 'http://localhost:3001/api'
API_KEY = 'your-api-key-here'  # Get from dashboard


class APIMonitorClient:
    def __init__(self, api_key: str, base_url: str = API_URL):
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json',
        }

    def _request(self, method: str, endpoint: str, **kwargs):
        url = f"{self.base_url}{endpoint}"
        response = requests.request(method, url, headers=self.headers, **kwargs)
        response.raise_for_status()
        return response.json() if response.content else None

    # Monitors
    def create_monitor(self, config: Dict) -> Dict:
        """Create a new monitor"""
        return self._request('POST', '/monitors', json=config)

    def get_monitors(self) -> List[Dict]:
        """Get all monitors"""
        return self._request('GET', '/monitors')

    def get_monitor(self, monitor_id: str) -> Dict:
        """Get a specific monitor"""
        return self._request('GET', f'/monitors/{monitor_id}')

    def update_monitor(self, monitor_id: str, updates: Dict) -> Dict:
        """Update a monitor"""
        return self._request('PUT', f'/monitors/{monitor_id}', json=updates)

    def delete_monitor(self, monitor_id: str) -> None:
        """Delete a monitor"""
        self._request('DELETE', f'/monitors/{monitor_id}')

    def trigger_check(self, monitor_id: str) -> Dict:
        """Manually trigger a check"""
        return self._request('POST', f'/monitors/{monitor_id}/trigger')

    # Stats
    def get_stats(self, monitor_id: str, period: str = '24h') -> Dict:
        """Get monitor statistics"""
        return self._request('GET', '/checks/stats', params={
            'monitorId': monitor_id,
            'period': period,
        })

    def get_checks(self, monitor_id: str, limit: int = 100, offset: int = 0) -> Dict:
        """Get check history"""
        return self._request('GET', '/checks', params={
            'monitorId': monitor_id,
            'limit': limit,
            'offset': offset,
        })

    # Incidents
    def get_incidents(self, filters: Optional[Dict] = None) -> Dict:
        """Get incidents"""
        return self._request('GET', '/incidents', params=filters or {})

    def acknowledge_incident(self, incident_id: str) -> Dict:
        """Acknowledge an incident"""
        return self._request('POST', f'/incidents/{incident_id}/acknowledge')

    def resolve_incident(self, incident_id: str) -> Dict:
        """Resolve an incident"""
        return self._request('POST', f'/incidents/{incident_id}/resolve')

    # Alert Rules
    def create_alert_rule(self, config: Dict) -> Dict:
        """Create alert rule"""
        return self._request('POST', '/alerts/rules', json=config)

    def get_alert_rules(self, monitor_id: Optional[str] = None) -> List[Dict]:
        """Get alert rules"""
        params = {'monitorId': monitor_id} if monitor_id else {}
        return self._request('GET', '/alerts/rules', params=params)


def main():
    """Example usage"""
    client = APIMonitorClient(API_KEY)

    try:
        # Create a monitor
        print('Creating monitor...')
        monitor = client.create_monitor({
            'name': 'Example API',
            'url': 'https://api.example.com/health',
            'method': 'GET',
            'interval': 300000,  # 5 minutes
            'timeout': 30000,
            'expectedStatus': 200,
            'regions': ['us-east'],
        })
        print(f"Monitor created: {monitor['id']}")

        # Get stats
        print('\nFetching stats...')
        stats = client.get_stats(monitor['id'], '24h')
        print(f"Uptime: {stats['uptime']}%")
        print(f"Avg Response Time: {stats['responseTime']['avg']}ms")
        print(f"Total Checks: {stats['totalChecks']}")

        # Create alert rule
        print('\nCreating alert rule...')
        alert_rule = client.create_alert_rule({
            'monitorId': monitor['id'],
            'name': 'Downtime Alert',
            'condition': 'DOWN',
            'consecutiveFails': 3,
            'email': True,
        })
        print(f"Alert rule created: {alert_rule['id']}")

        # List all monitors
        print('\nAll monitors:')
        monitors = client.get_monitors()
        for m in monitors:
            status = 'enabled' if m['enabled'] else 'disabled'
            print(f"- {m['name']} ({status})")

    except requests.exceptions.HTTPError as e:
        print(f"Error: {e.response.json()}")
    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == '__main__':
    main()
