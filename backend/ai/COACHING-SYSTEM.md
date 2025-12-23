# PsychAssist - AI Coaching System

## Overview

PsychAssist is PULSE's AI-powered trading psychology assistant. It monitors trading behavior patterns to prevent tilting, overtrading, and emotional decision-making.

## Features

### Tilt Detection
- Monitors trade frequency (overtrading detection)
- Tracks consecutive losses (loss streak monitoring)
- Analyzes hold time patterns (revenge trading detection)
- Provides real-time risk assessments and recommendations

### NTN Reports (Need-To-Know)
- Daily market risk classification (Base Hit vs Home Run days)
- VIX level and volatility regime analysis
- Key technical levels (20 EMA, 100 EMA)
- Economic calendar integration
- IV-scored news prioritization

### Knowledge Base Integration
- Query trading strategies from the knowledge base
- Get personalized recommendations based on your trading history
- Access to curated trading psychology resources

## API Endpoints

### Tilt Check
```
GET /ai/psychassist/tilt-check?accountId={id}
```
Returns current tilt risk level (low/medium/high) with recommendations.

### NTN / Stats / Knowledge Base
These features were previously implemented via AWS Bedrock endpoints. They were removed from the deployable backend because they were not compatible with our current Encore deployment pipeline.

## Configuration

No additional secrets required for tilt detection.

## Database Tables

### ntn_reports
Stores generated NTN reports for each user.

### trades
Records trade history for pattern analysis.

### tilt_events
Logs detected tilt events and user acknowledgments.

## Tilt Detection Thresholds

| Metric | Medium Risk | High Risk |
|--------|-------------|-----------|
| Trades/Hour | > 5 | > 10 |
| Loss Streak | - | >= 3 |
| Avg Hold Time | < 30s | - |

## Integration with RiskFlow

PsychAssist works alongside RiskFlow to provide comprehensive risk management:
- PsychAssist: Behavioral/emotional risk monitoring
- RiskFlow: Market/external risk assessment via IV Scoring Matrix
