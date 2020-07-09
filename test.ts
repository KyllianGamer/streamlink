import fetch from 'chainfetch';
import { stringify } from '@favware/querystring';

const device_id = '';
const token = '';

void fetch
    .post(`https://api.spotify.com/v1/me/player/next${stringify({ device_id })}`)
    .set([
        ['Accept', 'application/json'],
        ['Content-Type', 'application/json'],
        ['Authorization', `Bearer ${token}`]
    ]);