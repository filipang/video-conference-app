from django.shortcuts import render

from django.views.generic import View

from django.http import HttpResponse
from django.http import JsonResponse
import uuid
# Create your views here.

conferences = dict()


class HomeView(View):
    template_name = 'home.html'

    def get(self, request):
        message_type = request.GET.get('message_type')

        if message_type == 'get_answer_and_candidates':
            uid = request.GET.get('conference_id')
            local_user_id = request.GET.get('user_id')
            print(f'{message_type}: uid - {uid} | user_id - {local_user_id}')
            if 'answer' in conferences[uid][local_user_id]:
                if 'remote_candidates' in conferences[uid][local_user_id]:
                    answer = {'sdpMessage': {
                        'type': 'answer',
                        'sdp': conferences[uid][local_user_id]['answer']
                        }
                    }

                    ice_candidates = []
                    for ic in conferences[uid][local_user_id]['remote_candidates']:
                        ice_candidates.append({'sdpMessage': ic})
                    conferences[uid][local_user_id].pop('answer', None)
                    conferences[uid][local_user_id].pop('remote_candidates', None)
                    return JsonResponse({'answer': answer, 'ice_candidates': ice_candidates})
                return JsonResponse({'err': 'ANSWER FOUND BUT NO MESSAGE'})
            return JsonResponse({'err': 'NO ANSWER FOUND'})

        if message_type == 'get_offer_and_candidates':
            uid = request.GET.get('conference_id')
            local_user_id = request.GET.get('user_id')
            print(f'{message_type}: uid - {uid} | user_id - {local_user_id}')
            if 'offer' in conferences[uid][local_user_id]:
                if 'local_candidates' in conferences[uid][local_user_id]:
                    offer = {'sdpMessage': {
                        'type': 'offer',
                        'sdp': conferences[uid][local_user_id]['offer']
                        }
                    }

                    ice_candidates = []
                    for ic in conferences[uid][local_user_id]['local_candidates']:
                        ice_candidates.append({'sdpMessage': ic})
                    return JsonResponse({'offer': offer, 'ice_candidates': ice_candidates, 'user': local_user_id})
                return JsonResponse({'err': 'OFFER FOUND BUT NO MESSAGE'})
            return JsonResponse({'err': 'NO OFFER FOUND'})

        if message_type == 'get_session_users':
            uid = request.GET.get('conference_id')
            print(f'{message_type}: uid - {uid}')
            print(list(conferences[uid].keys()))
            return JsonResponse({'users': list(conferences[uid].keys())})

        return render(request, self.template_name)

    def post(self, request):
        message_type = request.POST.get('message_type')
        #Create session
        if message_type == 'create_conference':
            uid = str(uuid.uuid1())
            user_id = request.POST.get('user_id')
            print(f'{message_type}: uid - {uid} | user_id - {user_id}')
            conferences.update({uid: {user_id: {
                                          'local_candidates': [],
                                          'remote_candidates': [],
                                          }}})
            return JsonResponse({'conference_id': uid,
                                 uid: {user_id: {
                                          'local_candidates': [],
                                          'remote_candidates': [],
                                          }}})

        if message_type == 'post_offer':
            uid = request.POST.get('conference_id')
            user_id = request.POST.get('user_id')
            sdp = request.POST.get('sdp')
            print(f'{message_type}: uid - {uid} | user_id - {user_id}')
            print('BEFORE')
            print(list(conferences[uid].keys()))
            print(f'Trying user {user_id} on the uid {uid}')
            if user_id in conferences[uid]:
                conferences[uid][user_id].update({'offer': sdp})
            else:
                conferences[uid].update({user_id: {'offer': sdp}})
            print('AFTER')
            print(list(conferences[uid].keys()))
            return JsonResponse({'msg': 'success post_offer'})

        if message_type == 'post_answer':
            uid = request.POST.get('conference_id')
            sdp = request.POST.get('sdp')
            print(f'{message_type}: uid - {uid}')

            print('BEFORE')
            print(list(conferences[uid].keys()))
            remote_user_id = request.POST.get('remote_user_id')
            for user in list(conferences[uid].keys()):
                conferences[uid][user].update({'answer': sdp})

            print('AFTER')
            print(list(conferences[uid].keys()))
            return JsonResponse({'msg': f'succesfully answered all {len(list(conferences[uid].keys()))} existing users',
                                 'user-list': list(conferences[uid].keys())})

        if message_type == 'post_local_candidate':
            uid = request.POST.get('conference_id')
            local_user_id = request.POST.get('user_id')
            candidate = request.POST.get('sdp')
            print(f'{message_type}: uid - {uid} | user_id - {local_user_id}')
            print('BEFORE')
            print(list(conferences[uid].keys()))
            if local_user_id in conferences[uid]:
                if 'local_candidates' in conferences[uid][local_user_id]:
                    conferences[uid][local_user_id]['local_candidates'].append(candidate)
                else:
                    conferences[uid][local_user_id].update({'local_candidates': [candidate]})

            else:
                conferences[uid].update({local_user_id: {'local_candidates': [candidate]}})

            print('AFTER')
            print(list(conferences[uid].keys()))
            return JsonResponse({'msg': 'success post_local_candidate'})

        if message_type == 'post_remote_candidate':
            uid = request.POST.get('conference_id')
            local_user_id = request.POST.get('user_id')
            #remote_user_id = request.POST.get('remote_user_id')
            candidate = request.POST.get('sdp')
            print(f'{message_type}: uid - {uid} | user_id - {local_user_id}')
            print('BEFORE')
            print(list(conferences[uid].keys()))
            for user in list(conferences[uid].keys()):
                if 'remote_candidates' in conferences[uid][user]:
                    conferences[uid][user]['remote_candidates'].append(candidate)
                else:
                    conferences[uid][user].update({'remote_candidates': [candidate]})

            print('AFTER')
            print(list(conferences[uid].keys()))
            return JsonResponse({'msg': 'success all post_remote_candidate'})
        return JsonResponse({'err': 'Unkown message type'})
