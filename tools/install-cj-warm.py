"""Install only a targeted, flock-protected catalog refresh; never replay the WP cron queue."""
import subprocess
SSH=['ssh','-T','-oBatchMode=yes','-oStrictHostKeyChecking=yes','-p','21098','altugpaa@162.0.232.232']
private='/home/altugpaa/gdcs-private/cj-storefront-20261115'
script="""#!/bin/bash
set -eu
cd /home/altugpaa/sastamilaga.com
/opt/alt/php82/usr/bin/php -d register_argc_argv=On /usr/local/sbin/wp eval '\\Sasta\\CJ\\Bridge::warm();' --quiet
"""
# PHP namespace separators are literal in the shell's single-quoted PHP argument.
script=script.replace('\\\\','\\')
subprocess.run(SSH+['cat > '+private+'/warm.sh'],input=script.encode(),check=True)
subprocess.run(SSH+['chmod 700 '+private+'/warm.sh'],check=True)
old=subprocess.run(SSH+['crontab -l'],capture_output=True,text=True)
if old.returncode not in (0,1):raise RuntimeError('Cannot read existing crontab; no mutation performed')
marker='# Sasta CJ active-catalog refresh'
if marker not in old.stdout:
 line='* * * * * /usr/bin/flock -n '+private+'/warm.lock /bin/bash '+private+'/warm.sh >> '+private+'/warm.log 2>&1 '+marker+'\n'
 subprocess.run(SSH+['crontab -'],input=(old.stdout.rstrip()+'\n'+line).encode(),check=True)
print('Targeted active-only warm task installed; existing crontab preserved.')
