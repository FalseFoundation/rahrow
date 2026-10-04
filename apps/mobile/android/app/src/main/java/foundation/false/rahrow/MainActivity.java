package foundation.falsefoundation.rahrow;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		registerPlugin(RahRowVpnPlugin.class);
		registerPlugin(RahRowQrPlugin.class);
		registerPlugin(RahRowSubscriptionPlugin.class);
		registerPlugin(RahRowNetworkPlugin.class);
		super.onCreate(savedInstanceState);
		handleVpnShortcut(getIntent());
	}

	@Override
	protected void onNewIntent(Intent intent) {
		super.onNewIntent(intent);
		setIntent(intent);
		handleVpnShortcut(intent);
	}

	private void handleVpnShortcut(Intent intent) {
		if (intent == null || intent.getAction() == null) {
			return;
		}
		String action = intent.getAction();
		if (RahRowVpnControl.ACTION_DISCONNECT.equals(action)) {
			RahRowVpnControl.disconnect(this);
			return;
		}
		if (RahRowVpnControl.ACTION_CONNECT.equals(action)) {
			Intent pending = RahRowVpnControl.connectLastSessionOrPrepare(this);
			if (pending != null) {
				startActivity(pending);
			}
			return;
		}
		if (RahRowVpnControl.ACTION_TOGGLE.equals(action)) {
			if (RahRowVpnControl.isConnected(this)) {
				RahRowVpnControl.disconnect(this);
			} else {
				Intent pending = RahRowVpnControl.connectLastSessionOrPrepare(this);
				if (pending != null) {
					startActivity(pending);
				}
			}
		}
	}
}
